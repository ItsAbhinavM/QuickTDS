import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  daysBetween,
  hash,
  normalizeId,
  normalizePan,
  normalizeTan,
  parseBoolean,
  parseCsv,
  parseDate,
  parseMoney,
  requireColumns
} from './csv.js';
import { reconcile } from './engine.js';
import type {
  BankAccount,
  BankTransaction,
  Company,
  Counterparty,
  Form26AsRow,
  Form26AsSnapshot,
  Invoice,
  Payment,
  PaymentAllocation,
  Quarter,
  ReconciliationSummary,
  RecoveryCase,
  TdsExpectation,
  UploadData,
  WorkspaceState
} from './tds.types.js';

const QUARTERS = new Set(['Q1', 'Q2', 'Q3', 'Q4']);
const CASEABLE_STATUSES = new Set([
  'PARTIALLY_MATCHED',
  'MISSING_CREDIT',
  'AMOUNT_MISMATCH',
  'SECTION_MISMATCH',
  'CROSS_PERIOD',
  'PAN_ERROR_SUSPECTED',
  'AMBIGUOUS'
]);

function required(row: Record<string, string>, field: string, label: string): string {
  const value = row[field]?.trim();
  if (!value) throw new Error(`${label}.${field} is required`);
  return value;
}

function parseQuarter(value: string, field: string): Quarter {
  if (!QUARTERS.has(value)) throw new Error(`${field} must be Q1, Q2, Q3, or Q4`);
  return value as Quarter;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${createHash('sha256').update(value).digest('hex').slice(0, 12).toUpperCase()}`;
}

function strongestEvidence(values: Payment['evidence'][]): Payment['evidence'] | 'NONE' {
  const order: Payment['evidence'][] = ['FORM_16A', 'PAYMENT_ADVICE', 'LEDGER_ENTRY', 'INFERRED'];
  return order.find((item) => values.includes(item)) ?? 'NONE';
}

export class TdsService {
  private readonly root: string;

  constructor() {
    const configuredRoot = process.env.QUICK_TDS_DATA_DIR;
    const localRoot = path.join(process.cwd(), 'data', 'workspaces');
    try {
      mkdirSync(configuredRoot || localRoot, { recursive: true });
      this.root = configuredRoot || localRoot;
      this.verifyWritable();
    } catch (error) {
      if (configuredRoot) {
        throw new Error(`QUICK_TDS_DATA_DIR is not writable: ${configuredRoot}`, { cause: error });
      }
      this.root = path.join(tmpdir(), 'quick-tds', 'workspaces');
      mkdirSync(this.root, { recursive: true });
      this.verifyWritable();
    }
  }

  private verifyWritable() {
    const probe = path.join(this.root, `.write-test-${randomUUID()}`);
    writeFileSync(probe, 'ok', { flag: 'wx' });
    unlinkSync(probe);
  }

  upload(data: UploadData) {
    const workspaceId = this.workspaceId(data.workspaceId);
    const company: Company = {
      name: (data.company?.name || '').trim(),
      pan: normalizePan(data.company?.pan || ''),
      financialYear: (data.company?.financialYear || '').trim()
    };
    if (!company.name || !/^\d{4}-\d{2}$/.test(company.financialYear)) {
      throw new Error('Company name and financial year in YYYY-YY format are required');
    }

    const counterparties = this.parseCounterparties(data.counterpartiesCsv);
    const bankAccounts = this.parseBankAccounts(data.bankAccountsCsv);
    const invoices = this.parseInvoices(data.invoicesCsv);
    const payments = this.parsePayments(data.paymentsCsv);
    const allocations = this.parseAllocations(data.allocationsCsv);
    const bankTransactions = this.parseBankTransactions(data.bankTransactionsCsv);
    const snapshot = this.parseSnapshot(data.form26asCsv, 'ORIGINAL');

    this.validateReferences(counterparties, bankAccounts, invoices, payments, allocations, bankTransactions);

    const sources = [
      ['counterparties', data.counterpartiesCsv],
      ['bank_accounts', data.bankAccountsCsv],
      ['invoices', data.invoicesCsv],
      ['payments', data.paymentsCsv],
      ['allocations', data.allocationsCsv],
      ['bank_transactions', data.bankTransactionsCsv],
      ['form26as', data.form26asCsv]
    ].map(([kind, content]) => ({ kind, sha256: hash(content), importedAt: new Date().toISOString() }));

    const state: WorkspaceState = {
      schemaVersion: 1,
      workspaceId,
      company,
      counterparties,
      bankAccounts,
      invoices,
      payments,
      allocations,
      bankTransactions,
      bankLinks: [],
      expectations: [],
      snapshots: [snapshot],
      decisions: [],
      cases: [],
      sources
    };
    this.save(state);

    return {
      workspaceId,
      company,
      imported: {
        counterparties: counterparties.length,
        bankAccounts: bankAccounts.length,
        invoices: invoices.length,
        payments: payments.length,
        allocations: allocations.length,
        bankTransactions: bankTransactions.length,
        form26asRows: snapshot.rows.length
      },
      nextStep: 'Run link_transactions.'
    };
  }

  linkTransactions(workspaceId: string) {
    const state = this.load(workspaceId);
    state.bankLinks = state.payments.map((payment) => {
      const exact = state.bankTransactions.filter((transaction) =>
        transaction.bankAccountId === payment.bankAccountId &&
        transaction.reference === payment.bankReference &&
        transaction.amountPaise === payment.netPaise
      );
      if (exact.length === 1) return { paymentId: payment.id, bankTransactionId: exact[0].id, status: 'EXACT' as const };

      const proposed = state.bankTransactions.filter((transaction) =>
        transaction.bankAccountId === payment.bankAccountId &&
        transaction.amountPaise === payment.netPaise &&
        daysBetween(transaction.date, payment.date) <= 3
      );
      if (proposed.length === 1) return { paymentId: payment.id, bankTransactionId: proposed[0].id, status: 'PROPOSED' as const };
      return { paymentId: payment.id, status: 'UNMATCHED' as const };
    });
    this.save(state);

    return {
      workspaceId: state.workspaceId,
      invoicePaymentLinks: state.allocations.length,
      bankLinks: state.bankLinks,
      counts: {
        exact: state.bankLinks.filter((link) => link.status === 'EXACT').length,
        proposed: state.bankLinks.filter((link) => link.status === 'PROPOSED').length,
        unmatched: state.bankLinks.filter((link) => link.status === 'UNMATCHED').length
      },
      nextStep: 'Run calculate_expected_tds.'
    };
  }

  calculateExpectedTds(workspaceId: string) {
    const state = this.load(workspaceId);
    const paymentTdsByInvoice = new Map<string, number>();
    const evidenceByInvoice = new Map<string, Payment['evidence'][]>();

    for (const payment of state.payments) {
      const allocations = state.allocations.filter((allocation) => allocation.paymentId === payment.id)
        .sort((a, b) => a.id.localeCompare(b.id));
      const allocationTotal = allocations.reduce((total, allocation) => total + allocation.amountPaise, 0);
      let allocatedTds = 0;
      allocations.forEach((allocation, index) => {
        const tds = index === allocations.length - 1
          ? payment.tdsPaise - allocatedTds
          : Math.round(payment.tdsPaise * allocation.amountPaise / allocationTotal);
        allocatedTds += tds;
        paymentTdsByInvoice.set(allocation.invoiceId, (paymentTdsByInvoice.get(allocation.invoiceId) ?? 0) + tds);
        evidenceByInvoice.set(allocation.invoiceId, [...(evidenceByInvoice.get(allocation.invoiceId) ?? []), payment.evidence]);
      });
    }

    const counterparties = new Map(state.counterparties.map((counterparty) => [counterparty.id, counterparty]));
    state.expectations = state.invoices.filter((invoice) => invoice.tdsApplicable).map<TdsExpectation>((invoice) => {
      const counterparty = counterparties.get(invoice.counterpartyId)!;
      return {
        invoiceId: invoice.id,
        counterpartyId: counterparty.id,
        counterpartyName: counterparty.name,
        tan: counterparty.tan,
        quarter: invoice.quarter,
        section: invoice.section,
        transactionType: invoice.transactionType,
        expectedPaise: Math.round(invoice.tdsBasePaise * invoice.ratePercent / 100),
        actualWithheldPaise: paymentTdsByInvoice.get(invoice.id) ?? 0,
        evidence: strongestEvidence(evidenceByInvoice.get(invoice.id) ?? []),
        rule: `${invoice.section} at ${invoice.ratePercent}% on configured base`
      };
    });
    this.save(state);

    return {
      workspaceId: state.workspaceId,
      expectations: state.expectations,
      totals: {
        expectedPaise: state.expectations.reduce((total, item) => total + item.expectedPaise, 0),
        actualWithheldPaise: state.expectations.reduce((total, item) => total + item.actualWithheldPaise, 0)
      },
      disclaimer: 'Expected TDS uses the uploaded section, rate, and base. It is not autonomous tax advice.',
      nextStep: 'Run run_26as_reconciliation.'
    };
  }

  runReconciliation(workspaceId: string) {
    const state = this.load(workspaceId);
    if (state.expectations.length === 0) throw new Error('Calculate expected TDS before reconciliation');
    const snapshot = state.snapshots.at(-1);
    if (!snapshot) throw new Error('No Form 26AS snapshot is available');
    const result = reconcile(state.expectations, snapshot.rows, snapshot.id);
    state.decisions = result.decisions;
    this.save(state);
    return {
      workspaceId: state.workspaceId,
      company: state.company,
      snapshot: { id: snapshot.id, kind: snapshot.kind, importedAt: snapshot.importedAt },
      summary: result.summary,
      decisions: result.decisions,
      nextStep: 'Review mismatches and run create_recovery_cases.'
    };
  }

  createCases(workspaceId: string) {
    const state = this.load(workspaceId);
    if (state.decisions.length === 0) throw new Error('Run reconciliation before creating cases');
    const now = new Date().toISOString();
    const existing = new Map(state.cases.map((item) => [item.invoiceId, item]));

    for (const decision of state.decisions.filter((item) => CASEABLE_STATUSES.has(item.status))) {
      if (existing.has(decision.invoiceId)) continue;
      state.cases.push({
        id: stableId('CASE', `${state.workspaceId}:${decision.invoiceId}`),
        decisionId: decision.id,
        invoiceId: decision.invoiceId,
        counterpartyId: decision.counterpartyId,
        counterpartyName: decision.counterpartyName,
        tan: decision.tan,
        issue: decision.status,
        amountPaise: Math.max(decision.creditGapPaise, decision.deductionGapPaise) || decision.actualWithheldPaise,
        status: 'NEEDS_REVIEW',
        createdAt: now,
        updatedAt: now
      });
    }
    this.save(state);
    return { workspaceId: state.workspaceId, cases: state.cases };
  }

  recordCorrection(workspaceId: string, caseId: string, correctionReference: string, note?: string) {
    const state = this.load(workspaceId);
    const recoveryCase = state.cases.find((item) => item.id === caseId);
    if (!recoveryCase) throw new Error(`Recovery case ${caseId} was not found`);
    recoveryCase.correctionReference = correctionReference.trim();
    recoveryCase.note = note?.trim();
    recoveryCase.status = 'AWAITING_26AS';
    recoveryCase.updatedAt = new Date().toISOString();
    this.save(state);
    return { workspaceId: state.workspaceId, case: recoveryCase, nextStep: 'Upload a refreshed Form 26AS.' };
  }

  verifyRefreshed(workspaceId: string, form26asCsv: string) {
    const state = this.load(workspaceId);
    const previous = state.snapshots.at(-1);
    if (!previous) throw new Error('No original Form 26AS snapshot is available');
    const refreshed = this.parseSnapshot(form26asCsv, 'REFRESHED');
    state.snapshots.push(refreshed);
    const result = reconcile(state.expectations, refreshed.rows, refreshed.id);
    state.decisions = result.decisions;
    const latestByInvoice = new Map(result.decisions.map((decision) => [decision.invoiceId, decision]));
    for (const recoveryCase of state.cases) {
      const latest = latestByInvoice.get(recoveryCase.invoiceId);
      if (latest?.status === 'MATCHED') {
        recoveryCase.status = 'RESOLVED';
        recoveryCase.decisionId = latest.id;
        recoveryCase.updatedAt = new Date().toISOString();
      }
    }
    state.sources.push({ kind: 'refreshed_form26as', sha256: refreshed.sha256, importedAt: refreshed.importedAt });
    this.save(state);

    const previousById = new Map(previous.rows.map((row) => [row.id, row]));
    const refreshedById = new Map(refreshed.rows.map((row) => [row.id, row]));
    const added = refreshed.rows.filter((row) => !previousById.has(row.id)).map((row) => row.id);
    const removed = previous.rows.filter((row) => !refreshedById.has(row.id)).map((row) => row.id);
    const changed = refreshed.rows.filter((row) => {
      const old = previousById.get(row.id);
      return old && (old.tdsPaise !== row.tdsPaise || old.section !== row.section || old.quarter !== row.quarter);
    }).map((row) => row.id);

    return {
      workspaceId: state.workspaceId,
      previousSnapshotId: previous.id,
      refreshedSnapshotId: refreshed.id,
      changes: { added, removed, changed },
      summary: result.summary,
      decisions: result.decisions,
      cases: state.cases,
      resolvedCaseIds: state.cases.filter((item) => item.status === 'RESOLVED').map((item) => item.id)
    };
  }

  getWorkspace(workspaceId: string) {
    const state = this.load(workspaceId);
    return {
      workspaceId: state.workspaceId,
      company: state.company,
      summary: this.summarize(state),
      decisions: state.decisions,
      cases: state.cases,
      snapshots: state.snapshots.map(({ id, kind, importedAt, sha256 }) => ({ id, kind, importedAt, sha256 }))
    };
  }

  private summarize(state: WorkspaceState): ReconciliationSummary | null {
    if (state.decisions.length === 0) return null;
    const snapshot = state.snapshots.at(-1)!;
    return reconcile(state.expectations, snapshot.rows, snapshot.id).summary;
  }

  private parseCounterparties(content: string): Counterparty[] {
    const rows = parseCsv(content);
    requireColumns(rows, ['counterparty_id', 'name', 'tan', 'contact_email'], 'counterparties');
    return rows.map((row, index) => ({
      id: normalizeId(required(row, 'counterparty_id', `counterparties row ${index + 2}`), 'counterparty_id'),
      name: required(row, 'name', `counterparties row ${index + 2}`),
      tan: normalizeTan(required(row, 'tan', `counterparties row ${index + 2}`), 'tan'),
      contactEmail: row.contact_email || undefined
    }));
  }

  private parseBankAccounts(content: string): BankAccount[] {
    const rows = parseCsv(content);
    requireColumns(rows, ['account_id', 'bank_name', 'masked_account', 'account_type'], 'bank accounts');
    return rows.map((row, index) => ({
      id: normalizeId(required(row, 'account_id', `bank accounts row ${index + 2}`), 'account_id'),
      bankName: required(row, 'bank_name', `bank accounts row ${index + 2}`),
      maskedAccount: required(row, 'masked_account', `bank accounts row ${index + 2}`),
      type: required(row, 'account_type', `bank accounts row ${index + 2}`)
    }));
  }

  private parseInvoices(content: string): Invoice[] {
    const rows = parseCsv(content);
    requireColumns(rows, ['invoice_id', 'counterparty_id', 'date', 'quarter', 'transaction_type', 'gross_amount', 'tds_base', 'tds_applicable', 'section', 'rate_percent'], 'invoices');
    return rows.map((row, index) => ({
      id: normalizeId(required(row, 'invoice_id', `invoices row ${index + 2}`), 'invoice_id'),
      counterpartyId: normalizeId(required(row, 'counterparty_id', `invoices row ${index + 2}`), 'counterparty_id'),
      date: parseDate(required(row, 'date', `invoices row ${index + 2}`), 'invoice date'),
      quarter: parseQuarter(required(row, 'quarter', `invoices row ${index + 2}`), 'invoice quarter'),
      transactionType: required(row, 'transaction_type', `invoices row ${index + 2}`),
      grossPaise: parseMoney(required(row, 'gross_amount', `invoices row ${index + 2}`), 'gross_amount'),
      tdsBasePaise: parseMoney(required(row, 'tds_base', `invoices row ${index + 2}`), 'tds_base'),
      tdsApplicable: parseBoolean(required(row, 'tds_applicable', `invoices row ${index + 2}`), 'tds_applicable'),
      section: required(row, 'section', `invoices row ${index + 2}`),
      ratePercent: Number(required(row, 'rate_percent', `invoices row ${index + 2}`))
    }));
  }

  private parsePayments(content: string): Payment[] {
    const rows = parseCsv(content);
    requireColumns(rows, ['payment_id', 'counterparty_id', 'date', 'gross_amount', 'net_amount', 'tds_amount', 'bank_account_id', 'bank_reference', 'evidence'], 'payments');
    return rows.map((row, index) => {
      const evidence = required(row, 'evidence', `payments row ${index + 2}`).toUpperCase() as Payment['evidence'];
      if (!['PAYMENT_ADVICE', 'LEDGER_ENTRY', 'FORM_16A', 'INFERRED'].includes(evidence)) {
        throw new Error(`payments row ${index + 2}.evidence must be PAYMENT_ADVICE, LEDGER_ENTRY, FORM_16A, or INFERRED`);
      }
      return {
        id: normalizeId(required(row, 'payment_id', `payments row ${index + 2}`), 'payment_id'),
        counterpartyId: normalizeId(required(row, 'counterparty_id', `payments row ${index + 2}`), 'counterparty_id'),
        date: parseDate(required(row, 'date', `payments row ${index + 2}`), 'payment date'),
        grossPaise: parseMoney(required(row, 'gross_amount', `payments row ${index + 2}`), 'gross_amount'),
        netPaise: parseMoney(required(row, 'net_amount', `payments row ${index + 2}`), 'net_amount'),
        tdsPaise: parseMoney(required(row, 'tds_amount', `payments row ${index + 2}`), 'tds_amount'),
        bankAccountId: normalizeId(required(row, 'bank_account_id', `payments row ${index + 2}`), 'bank_account_id'),
        bankReference: required(row, 'bank_reference', `payments row ${index + 2}`),
        evidence
      };
    });
  }

  private parseAllocations(content: string): PaymentAllocation[] {
    const rows = parseCsv(content);
    requireColumns(rows, ['allocation_id', 'payment_id', 'invoice_id', 'amount'], 'allocations');
    return rows.map((row, index) => ({
      id: normalizeId(required(row, 'allocation_id', `allocations row ${index + 2}`), 'allocation_id'),
      paymentId: normalizeId(required(row, 'payment_id', `allocations row ${index + 2}`), 'payment_id'),
      invoiceId: normalizeId(required(row, 'invoice_id', `allocations row ${index + 2}`), 'invoice_id'),
      amountPaise: parseMoney(required(row, 'amount', `allocations row ${index + 2}`), 'allocation amount')
    }));
  }

  private parseBankTransactions(content: string): BankTransaction[] {
    const rows = parseCsv(content);
    requireColumns(rows, ['transaction_id', 'bank_account_id', 'date', 'amount', 'reference', 'narration'], 'bank transactions');
    return rows.map((row, index) => ({
      id: normalizeId(required(row, 'transaction_id', `bank transactions row ${index + 2}`), 'transaction_id'),
      bankAccountId: normalizeId(required(row, 'bank_account_id', `bank transactions row ${index + 2}`), 'bank_account_id'),
      date: parseDate(required(row, 'date', `bank transactions row ${index + 2}`), 'bank transaction date'),
      amountPaise: parseMoney(required(row, 'amount', `bank transactions row ${index + 2}`), 'bank amount'),
      reference: required(row, 'reference', `bank transactions row ${index + 2}`),
      narration: required(row, 'narration', `bank transactions row ${index + 2}`)
    }));
  }

  private parseSnapshot(content: string, kind: Form26AsSnapshot['kind']): Form26AsSnapshot {
    const rows = parseCsv(content);
    requireColumns(rows, ['row_id', 'tan', 'deductor_name', 'transaction_date', 'quarter', 'section', 'gross_amount', 'tds_amount'], 'Form 26AS');
    const parsedRows = rows.map<Form26AsRow>((row, index) => ({
      id: normalizeId(required(row, 'row_id', `Form 26AS row ${index + 2}`), 'row_id'),
      tan: normalizeTan(required(row, 'tan', `Form 26AS row ${index + 2}`), 'tan'),
      deductorName: required(row, 'deductor_name', `Form 26AS row ${index + 2}`),
      transactionDate: parseDate(required(row, 'transaction_date', `Form 26AS row ${index + 2}`), 'Form 26AS transaction date'),
      quarter: parseQuarter(required(row, 'quarter', `Form 26AS row ${index + 2}`), 'Form 26AS quarter'),
      section: required(row, 'section', `Form 26AS row ${index + 2}`),
      grossPaise: parseMoney(required(row, 'gross_amount', `Form 26AS row ${index + 2}`), 'Form 26AS gross amount'),
      tdsPaise: parseMoney(required(row, 'tds_amount', `Form 26AS row ${index + 2}`), 'Form 26AS TDS amount'),
      sourceRow: index + 2
    }));
    const sha256 = hash(content);
    return {
      id: stableId('SNAP', `${kind}:${sha256}`),
      importedAt: new Date().toISOString(),
      sha256,
      kind,
      rows: parsedRows
    };
  }

  private validateReferences(
    counterparties: Counterparty[], bankAccounts: BankAccount[], invoices: Invoice[], payments: Payment[],
    allocations: PaymentAllocation[], bankTransactions: BankTransaction[]
  ) {
    for (const collection of [counterparties, bankAccounts, invoices, payments, allocations, bankTransactions]) {
      const ids = collection.map((item) => item.id);
      if (new Set(ids).size !== ids.length) throw new Error('Imported data contains duplicate IDs');
    }
    const counterpartiesById = new Set(counterparties.map((item) => item.id));
    const accountsById = new Set(bankAccounts.map((item) => item.id));
    const invoicesById = new Set(invoices.map((item) => item.id));
    const paymentsById = new Set(payments.map((item) => item.id));
    invoices.forEach((item) => { if (!counterpartiesById.has(item.counterpartyId)) throw new Error(`Invoice ${item.id} references an unknown counterparty`); });
    payments.forEach((item) => {
      if (!counterpartiesById.has(item.counterpartyId)) throw new Error(`Payment ${item.id} references an unknown counterparty`);
      if (!accountsById.has(item.bankAccountId)) throw new Error(`Payment ${item.id} references an unknown bank account`);
    });
    allocations.forEach((item) => {
      if (!paymentsById.has(item.paymentId) || !invoicesById.has(item.invoiceId)) throw new Error(`Allocation ${item.id} has an unknown payment or invoice`);
    });
    bankTransactions.forEach((item) => { if (!accountsById.has(item.bankAccountId)) throw new Error(`Bank transaction ${item.id} references an unknown account`); });
  }

  private workspaceId(value: string): string {
    const normalized = (value || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,50}$/.test(normalized)) throw new Error('workspaceId must contain 2-50 letters, numbers, underscores, or hyphens');
    return normalized;
  }

  private statePath(workspaceId: string): string {
    return path.join(this.root, this.workspaceId(workspaceId), 'state.json');
  }

  private load(workspaceId: string): WorkspaceState {
    const file = this.statePath(workspaceId);
    if (!existsSync(file)) throw new Error(`Workspace ${workspaceId} was not found`);
    return JSON.parse(readFileSync(file, 'utf8')) as WorkspaceState;
  }

  private save(state: WorkspaceState) {
    const file = this.statePath(state.workspaceId);
    mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    writeFileSync(temporary, JSON.stringify(state, null, 2), 'utf8');
    renameSync(temporary, file);
  }
}
