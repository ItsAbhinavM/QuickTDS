export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type MatchStatus =
  | 'MATCHED'
  | 'PARTIALLY_MATCHED'
  | 'MISSING_CREDIT'
  | 'AMOUNT_MISMATCH'
  | 'SECTION_MISMATCH'
  | 'CROSS_PERIOD'
  | 'PAN_ERROR_SUSPECTED'
  | 'AMBIGUOUS';

export type CaseStatus =
  | 'NEEDS_REVIEW'
  | 'OPEN'
  | 'CORRECTION_REQUESTED'
  | 'AWAITING_26AS'
  | 'RESOLVED'
  | 'CLOSED_UNRESOLVED';

export interface Company {
  name: string;
  pan: string;
  financialYear: string;
}

export interface Counterparty {
  id: string;
  name: string;
  tan: string;
  contactEmail?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  maskedAccount: string;
  type: string;
}

export interface Invoice {
  id: string;
  counterpartyId: string;
  date: string;
  quarter: Quarter;
  transactionType: string;
  grossPaise: number;
  tdsBasePaise: number;
  tdsApplicable: boolean;
  section: string;
  ratePercent: number;
}

export interface Payment {
  id: string;
  counterpartyId: string;
  date: string;
  grossPaise: number;
  netPaise: number;
  tdsPaise: number;
  bankAccountId: string;
  bankReference: string;
  evidence: 'PAYMENT_ADVICE' | 'LEDGER_ENTRY' | 'FORM_16A' | 'INFERRED';
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amountPaise: number;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  amountPaise: number;
  reference: string;
  narration: string;
}

export interface BankLink {
  paymentId: string;
  bankTransactionId?: string;
  status: 'EXACT' | 'PROPOSED' | 'UNMATCHED';
}

export interface Form26AsRow {
  id: string;
  tan: string;
  deductorName: string;
  transactionDate: string;
  quarter: Quarter;
  section: string;
  grossPaise: number;
  tdsPaise: number;
  sourceRow: number;
}

export interface Form26AsSnapshot {
  id: string;
  importedAt: string;
  sha256: string;
  kind: 'ORIGINAL' | 'REFRESHED';
  rows: Form26AsRow[];
}

export interface TdsExpectation {
  invoiceId: string;
  counterpartyId: string;
  counterpartyName: string;
  tan: string;
  quarter: Quarter;
  section: string;
  transactionType: string;
  expectedPaise: number;
  actualWithheldPaise: number;
  evidence: Payment['evidence'] | 'NONE';
  rule: string;
}

export interface ReconciliationDecision extends TdsExpectation {
  id: string;
  status: MatchStatus;
  observedPaise: number;
  creditGapPaise: number;
  deductionGapPaise: number;
  observedRowIds: string[];
  explanation: string;
  allocationBasis: string;
}

export interface ReconciliationSummary {
  expectedPaise: number;
  actualWithheldPaise: number;
  observedPaise: number;
  recoverableGapPaise: number;
  deductionGapPaise: number;
  counts: Record<MatchStatus, number>;
}

export interface RecoveryCase {
  id: string;
  decisionId: string;
  invoiceId: string;
  counterpartyId: string;
  counterpartyName: string;
  tan: string;
  issue: MatchStatus;
  amountPaise: number;
  status: CaseStatus;
  correctionReference?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceRecord {
  kind: string;
  sha256: string;
  importedAt: string;
}

export interface WorkspaceState {
  schemaVersion: 1;
  workspaceId: string;
  company: Company;
  counterparties: Counterparty[];
  bankAccounts: BankAccount[];
  invoices: Invoice[];
  payments: Payment[];
  allocations: PaymentAllocation[];
  bankTransactions: BankTransaction[];
  bankLinks: BankLink[];
  expectations: TdsExpectation[];
  snapshots: Form26AsSnapshot[];
  decisions: ReconciliationDecision[];
  cases: RecoveryCase[];
  sources: SourceRecord[];
}

export interface UploadData {
  workspaceId: string;
  company: Company;
  counterpartiesCsv: string;
  bankAccountsCsv: string;
  invoicesCsv: string;
  paymentsCsv: string;
  allocationsCsv: string;
  bankTransactionsCsv: string;
  form26asCsv: string;
}
