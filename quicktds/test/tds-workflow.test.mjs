import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const dataDirectory = mkdtempSync(path.join(tmpdir(), 'quick-tds-'));
process.env.QUICK_TDS_DATA_DIR = dataDirectory;

const { TdsService } = await import('../dist/modules/tds/tds.service.js');
const fixtures = path.join(process.cwd(), 'fixtures');
const file = (name) => readFileSync(path.join(fixtures, name), 'utf8');

test.after(() => rmSync(dataDirectory, { recursive: true, force: true }));

test('runs the complete TDS recovery workflow deterministically', () => {
  const service = new TdsService();
  const workspaceId = 'workflow-test';
  const upload = service.upload({
    workspaceId,
    company: JSON.parse(file('company.json')),
    counterpartiesCsv: file('counterparties.csv'),
    bankAccountsCsv: file('bank-accounts.csv'),
    invoicesCsv: file('invoices.csv'),
    paymentsCsv: file('payments.csv'),
    allocationsCsv: file('payment-allocations.csv'),
    bankTransactionsCsv: file('bank-transactions.csv'),
    form26asCsv: file('form26as.csv')
  });

  assert.equal(upload.imported.invoices, 5);
  assert.equal(service.linkTransactions(workspaceId).counts.exact, 6);

  const calculated = service.calculateExpectedTds(workspaceId);
  assert.equal(calculated.totals.expectedPaise, 1_320_000);
  assert.equal(calculated.totals.actualWithheldPaise, 1_300_000);
  assert.equal(calculated.expectations.find((item) => item.invoiceId === 'INV-1002').actualWithheldPaise, 50_000);

  const original = service.runReconciliation(workspaceId);
  assert.equal(original.summary.recoverableGapPaise, 1_000_000);
  assert.equal(original.summary.deductionGapPaise, 20_000);
  assert.equal(original.decisions.find((item) => item.invoiceId === 'INT-FD-01').status, 'PAN_ERROR_SUSPECTED');
  assert.equal(original.decisions.find((item) => item.invoiceId === 'INV-3001').status, 'SECTION_MISMATCH');
  assert.equal(original.decisions.filter((item) => item.status === 'MATCHED').length, 2);

  const cases = service.createCases(workspaceId).cases;
  assert.equal(cases.length, 3);

  const refreshed = service.verifyRefreshed(workspaceId, file('form26as-refreshed.csv'));
  assert.deepEqual(refreshed.changes.added, ['26AS-HORIZON-Q1']);
  assert.deepEqual(refreshed.changes.changed, ['26AS-NOVA-Q2']);
  assert.equal(refreshed.resolvedCaseIds.length, 2);
  assert.equal(refreshed.summary.recoverableGapPaise, 0);

  const reloaded = new TdsService().getWorkspace(workspaceId);
  assert.equal(reloaded.cases.filter((item) => item.status === 'RESOLVED').length, 2);
  assert.equal(reloaded.snapshots.length, 2);
});
