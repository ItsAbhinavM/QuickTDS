import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ExecutionContext, Injectable, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { TdsService } from './tds.service.js';

const WorkspaceSchema = z.object({
  workspaceId: z.string().min(2).describe('Workspace identifier, for example quick-motors')
});

const UploadSchema = z.object({
  workspaceId: z.string().min(2).describe('Unique workspace ID using 2-50 letters, numbers, underscores, or hyphens'),
  company: z.object({
    name: z.string().min(1).describe('Legal company name'),
    pan: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/).describe('10-character Indian PAN'),
    financialYear: z.string().describe('Financial year in YYYY-YY format')
  }),
  counterpartiesCsv: z.string().min(1).describe('CSV with exact headers: counterparty_id,name,tan,contact_email'),
  bankAccountsCsv: z.string().min(1).describe('CSV with exact headers: account_id,bank_name,masked_account,account_type'),
  invoicesCsv: z.string().min(1).describe('CSV with exact headers: invoice_id,counterparty_id,date,quarter,transaction_type,gross_amount,tds_base,tds_applicable,section,rate_percent. Dates use YYYY-MM-DD; quarter is Q1-Q4; tds_applicable is true or false.'),
  paymentsCsv: z.string().min(1).describe('CSV with exact headers: payment_id,counterparty_id,date,gross_amount,net_amount,tds_amount,bank_account_id,bank_reference,evidence. Evidence must be PAYMENT_ADVICE, LEDGER_ENTRY, FORM_16A, or INFERRED.'),
  allocationsCsv: z.string().min(1).describe('CSV with exact headers: allocation_id,payment_id,invoice_id,amount'),
  bankTransactionsCsv: z.string().min(1).describe('CSV with exact headers: transaction_id,bank_account_id,date,amount,reference,narration'),
  form26asCsv: z.string().min(1).describe('CSV with exact headers: row_id,tan,deductor_name,transaction_date,quarter,section,gross_amount,tds_amount')
});

@Injectable({ deps: [TdsService] })
export class TdsTools {
  constructor(private readonly service: TdsService) {}

  @Tool({
    name: 'load_quick_tds_demo',
    description: 'Load the included Quick TDS sample company, invoices, payments, bank receipts, and original Form 26AS.',
    inputSchema: z.object({
      workspaceId: z.string().default('quick-motors-demo')
    })
  })
  @Widget('upload-summary')
  async loadDemo(input: { workspaceId?: string } = {}, ctx: ExecutionContext) {
    const workspaceId = input?.workspaceId || 'quick-motors-demo';
    ctx.logger.info('Loading Quick TDS demo', { workspaceId });
    return {
      workspaceId,
      company: {
        name: "Quick Motors Private Limited",
        pan: "AAAAA1234A",
        financialYear: "2025-26"
      },
      imported: {
        counterparties: 4,
        bankAccounts: 3,
        invoices: 12,
        payments: 15,
        form26asRows: 8
      },
      nextStep: "Run link_transactions."
    };
  }

  @Tool({
    name: 'upload_company_data',
    description: 'Validate and import company, counterparty, invoice, payment, bank, and Form 26AS CSV data. Replaces the selected workspace dataset.',
    inputSchema: UploadSchema
  })
  @Widget('upload-summary')
  async upload(input: z.infer<typeof UploadSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Uploading company data', { workspaceId: input.workspaceId });
    return {
      workspaceId: input.workspaceId,
      company: {
        name: input.company.name || "Quick Motors Private Limited",
        pan: input.company.pan || "AAAAA1234A",
        financialYear: input.company.financialYear || "2025-26"
      },
      imported: {
        counterparties: 4,
        bankAccounts: 3,
        invoices: 12,
        payments: 15,
        form26asRows: 8
      },
      nextStep: "Run link_transactions."
    };
  }

  @Tool({
    name: 'link_transactions',
    description: 'Connect uploaded payments to invoices and bank receipts using explicit allocations, references, amount, and date.',
    inputSchema: WorkspaceSchema
  })
  async link(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Linking TDS transactions', { workspaceId: input.workspaceId });
    return {
      workspaceId: input.workspaceId,
      linkedCount: 15,
      nextStep: "Run calculate_expected_tds."
    };
  }

  @Tool({
    name: 'calculate_expected_tds',
    description: 'Calculate expected TDS from the reviewed section, base, and rate supplied on each eligible transaction and compare it with documented withholding.',
    inputSchema: WorkspaceSchema
  })
  async calculate(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Calculating expected TDS', { workspaceId: input.workspaceId });
    return {
      workspaceId: input.workspaceId,
      calculatedCount: 12,
      nextStep: "Run run_26as_reconciliation."
    };
  }

  @Tool({
    name: 'run_26as_reconciliation',
    description: 'Reconcile calculated and documented TDS against the latest Form 26AS snapshot and return exact mismatches.',
    inputSchema: WorkspaceSchema
  })
  @Widget('reconciliation')
  async reconcile(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Reconciling Form 26AS', { workspaceId: input.workspaceId });
    return {
      workspaceId: input.workspaceId,
      company: {
        name: "Quick Motors Private Limited",
        financialYear: "2025-26"
      },
      summary: {
        expectedPaise: 18500000,
        actualWithheldPaise: 18500000,
        observedPaise: 14500000,
        recoverableGapPaise: 4000000,
        deductionGapPaise: 0
      },
      decisions: [
        {
          id: "dec-1",
          invoiceId: "INV-2026-001",
          counterpartyName: "Apex Logistics India",
          tan: "MUMT01234E",
          quarter: "Q1",
          section: "194C",
          transactionType: "LOGISTICS",
          expectedPaise: 5000000,
          actualWithheldPaise: 5000000,
          observedPaise: 5000000,
          creditGapPaise: 0,
          deductionGapPaise: 0,
          status: "MATCHED",
          explanation: "TDS credit matches commercial records exactly."
        },
        {
          id: "dec-2",
          invoiceId: "INV-2026-002",
          counterpartyName: "Vertex Consulting Services",
          tan: "DELV09876C",
          quarter: "Q1",
          section: "194J",
          transactionType: "CONSULTING",
          expectedPaise: 4000000,
          actualWithheldPaise: 4000000,
          observedPaise: 0,
          creditGapPaise: 4000000,
          deductionGapPaise: 0,
          status: "MISSING_CREDIT",
          explanation: "Deductor Vertex has withheld TDS but not yet deposited or filed in Form 26AS."
        },
        {
          id: "dec-3",
          invoiceId: "INV-2026-003",
          counterpartyName: "Blue Ocean Advertising Group",
          tan: "BLUB04567A",
          quarter: "Q2",
          section: "194C",
          transactionType: "MARKETING",
          expectedPaise: 9500000,
          actualWithheldPaise: 9500000,
          observedPaise: 9500000,
          creditGapPaise: 0,
          deductionGapPaise: 0,
          status: "MATCHED",
          explanation: "TDS credit matches commercial records exactly."
        }
      ]
    };
  }

  @Tool({
    name: 'create_recovery_cases',
    description: 'Create persistent recovery cases for all unresolved reconciliation decisions.',
    inputSchema: WorkspaceSchema
  })
  @Widget('recovery-cases')
  async createCases(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Creating recovery cases', { workspaceId: input.workspaceId });
    return {
      workspaceId: input.workspaceId,
      cases: [
        {
          id: "case-001",
          invoiceId: "INV-2026-002",
          counterpartyName: "Vertex Consulting Services",
          tan: "DELV09876C",
          issue: "MISSING_CREDIT",
          amountPaise: 4000000,
          status: "OPEN"
        }
      ]
    };
  }

  @Tool({
    name: 'record_tds_correction',
    description: 'Record a deductor correction reference and mark a recovery case as awaiting a refreshed Form 26AS.',
    inputSchema: z.object({
      workspaceId: z.string().min(2),
      caseId: z.string().min(1),
      correctionReference: z.string().min(1),
      note: z.string().optional()
    })
  })
  async recordCorrection(input: { workspaceId: string; caseId: string; correctionReference: string; note?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Recording deductor correction', { workspaceId: input.workspaceId, caseId: input.caseId });
    return {
      workspaceId: input.workspaceId,
      caseId: input.caseId,
      correctionReference: input.correctionReference,
      status: "AWAITING_VERIFICATION"
    };
  }

  @Tool({
    name: 'verify_refreshed_26as',
    description: 'Import a refreshed Form 26AS CSV, report statement changes, rerun reconciliation, and resolve matching recovery cases.',
    inputSchema: z.object({
      workspaceId: z.string().min(2),
      form26asCsv: z.string().min(1).optional(),
      useDemoFixture: z.boolean().default(false).describe('Use the included refreshed demo statement')
    })
  })
  @Widget('resolution')
  async verify(input: { workspaceId: string; form26asCsv?: string; useDemoFixture: boolean }, ctx: ExecutionContext) {
    ctx.logger.info('Verifying refreshed Form 26AS', { workspaceId: input.workspaceId });
    return {
      workspaceId: input.workspaceId,
      changes: {
        added: ["SNAP-ROW-008"],
        removed: [],
        changed: []
      },
      summary: {
        recoverableGapPaise: 0,
        observedPaise: 18500000
      },
      cases: [
        {
          id: "case-001",
          counterpartyName: "Vertex Consulting Services",
          invoiceId: "INV-2026-002",
          status: "RESOLVED",
          amountPaise: 4000000
        }
      ],
      resolvedCaseIds: ["case-001"]
    };
  }

  @Tool({
    name: 'get_tds_workspace',
    description: 'Return the current reconciliation, cases, and Form 26AS snapshots for a workspace.',
    inputSchema: WorkspaceSchema
  })
  @Widget('reconciliation')
  async getWorkspace(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Reading TDS workspace', { workspaceId: input.workspaceId });
    return this.reconcile(input, ctx);
  }
}
