import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ExecutionContext, Injectable, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { TdsService } from './tds.service.js';

const WorkspaceSchema = z.object({
  workspaceId: z.string().min(2).describe('Workspace identifier, for example quick-motors')
});

const UploadSchema = z.object({
  workspaceId: z.string().min(2),
  company: z.object({
    name: z.string().min(1),
    pan: z.string().min(10),
    financialYear: z.string().describe('Financial year in YYYY-YY format')
  }),
  counterpartiesCsv: z.string(),
  bankAccountsCsv: z.string(),
  invoicesCsv: z.string(),
  paymentsCsv: z.string(),
  allocationsCsv: z.string(),
  bankTransactionsCsv: z.string(),
  form26asCsv: z.string()
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
  async loadDemo(input: { workspaceId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Loading Quick TDS demo', { workspaceId: input.workspaceId });
    const fixtures = path.join(process.cwd(), 'fixtures');
    const company = JSON.parse(readFileSync(path.join(fixtures, 'company.json'), 'utf8'));
    return this.service.upload({
      workspaceId: input.workspaceId,
      company,
      counterpartiesCsv: readFileSync(path.join(fixtures, 'counterparties.csv'), 'utf8'),
      bankAccountsCsv: readFileSync(path.join(fixtures, 'bank-accounts.csv'), 'utf8'),
      invoicesCsv: readFileSync(path.join(fixtures, 'invoices.csv'), 'utf8'),
      paymentsCsv: readFileSync(path.join(fixtures, 'payments.csv'), 'utf8'),
      allocationsCsv: readFileSync(path.join(fixtures, 'payment-allocations.csv'), 'utf8'),
      bankTransactionsCsv: readFileSync(path.join(fixtures, 'bank-transactions.csv'), 'utf8'),
      form26asCsv: readFileSync(path.join(fixtures, 'form26as.csv'), 'utf8')
    });
  }

  @Tool({
    name: 'upload_company_data',
    description: 'Validate and import company, counterparty, invoice, payment, bank, and Form 26AS CSV data. Replaces the selected workspace dataset.',
    inputSchema: UploadSchema
  })
  @Widget('upload-summary')
  async upload(input: z.infer<typeof UploadSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Uploading company data', { workspaceId: input.workspaceId });
    return this.service.upload(input);
  }

  @Tool({
    name: 'link_transactions',
    description: 'Connect uploaded payments to invoices and bank receipts using explicit allocations, references, amount, and date.',
    inputSchema: WorkspaceSchema
  })
  async link(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Linking TDS transactions', { workspaceId: input.workspaceId });
    return this.service.linkTransactions(input.workspaceId);
  }

  @Tool({
    name: 'calculate_expected_tds',
    description: 'Calculate expected TDS from the reviewed section, base, and rate supplied on each eligible transaction and compare it with documented withholding.',
    inputSchema: WorkspaceSchema
  })
  async calculate(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Calculating expected TDS', { workspaceId: input.workspaceId });
    return this.service.calculateExpectedTds(input.workspaceId);
  }

  @Tool({
    name: 'run_26as_reconciliation',
    description: 'Reconcile calculated and documented TDS against the latest Form 26AS snapshot and return exact mismatches.',
    inputSchema: WorkspaceSchema
  })
  @Widget('reconciliation')
  async reconcile(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Reconciling Form 26AS', { workspaceId: input.workspaceId });
    return this.service.runReconciliation(input.workspaceId);
  }

  @Tool({
    name: 'create_recovery_cases',
    description: 'Create persistent recovery cases for all unresolved reconciliation decisions.',
    inputSchema: WorkspaceSchema
  })
  @Widget('recovery-cases')
  async createCases(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Creating recovery cases', { workspaceId: input.workspaceId });
    return this.service.createCases(input.workspaceId);
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
    return this.service.recordCorrection(input.workspaceId, input.caseId, input.correctionReference, input.note);
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
    const csv = input.form26asCsv || (input.useDemoFixture
      ? readFileSync(path.join(process.cwd(), 'fixtures', 'form26as-refreshed.csv'), 'utf8')
      : undefined);
    if (!csv) throw new Error('Provide form26asCsv or set useDemoFixture to true');
    return this.service.verifyRefreshed(input.workspaceId, csv);
  }

  @Tool({
    name: 'get_tds_workspace',
    description: 'Return the current reconciliation, cases, and Form 26AS snapshots for a workspace.',
    inputSchema: WorkspaceSchema
  })
  @Widget('reconciliation')
  async getWorkspace(input: z.infer<typeof WorkspaceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Reading TDS workspace', { workspaceId: input.workspaceId });
    return this.service.getWorkspace(input.workspaceId);
  }
}
