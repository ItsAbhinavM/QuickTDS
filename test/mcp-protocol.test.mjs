import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const expectedTools = [
  'calculate_expected_tds',
  'create_recovery_cases',
  'get_tds_workspace',
  'link_transactions',
  'load_quick_tds_demo',
  'record_tds_correction',
  'run_26as_reconciliation',
  'upload_company_data',
  'verify_refreshed_26as'
];
const resourceDirectory = path.join(process.cwd(), 'resources', 'quick-tds-test-pack');
const resource = (name) => readFileSync(path.join(resourceDirectory, name), 'utf8');

function structured(result) {
  assert.notEqual(result.isError, true);
  if (result.structuredContent) return result.structuredContent;
  const text = result.content.find((item) => item.type === 'text');
  assert.ok(text, 'tool result should include text or structured content');
  return JSON.parse(text.text);
}

test('exposes and runs the recovery workflow through MCP stdio', async () => {
  const dataDirectory = mkdtempSync(path.join(tmpdir(), 'quick-tds-mcp-'));
  const client = new Client({ name: 'quick-tds-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/index.js'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      MCP_TRANSPORT_TYPE: 'stdio',
      NODE_ENV: 'development',
      OAUTH_REQUIRED: 'false',
      QUICK_TDS_DATA_DIR: dataDirectory
    },
    stderr: 'pipe'
  });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), expectedTools);
    const uploadTool = tools.tools.find((tool) => tool.name === 'upload_company_data');
    assert.match(uploadTool.inputSchema.properties.paymentsCsv.description, /PAYMENT_ADVICE.*FORM_16A/);

    const demo = structured(await client.callTool({ name: 'load_quick_tds_demo', arguments: {} }));
    assert.equal(demo.workspaceId, 'quick-motors-demo');

    const workspaceId = 'mcp-protocol-test';
    const imported = structured(await client.callTool({
      name: 'upload_company_data',
      arguments: {
        workspaceId,
        company: { name: 'Quick Motors Private Limited', pan: 'AAAAA1234A', financialYear: '2025-26' },
        counterpartiesCsv: resource('01-counterparties.csv'),
        bankAccountsCsv: resource('02-bank-accounts.csv'),
        invoicesCsv: resource('03-invoice-ledger.csv'),
        paymentsCsv: resource('04-payments.csv'),
        allocationsCsv: resource('05-payment-allocations.csv'),
        bankTransactionsCsv: resource('06-bank-transactions.csv'),
        form26asCsv: resource('07-form26as-original.csv')
      }
    }));
    assert.equal(imported.imported.invoices, 5);

    const linked = structured(await client.callTool({ name: 'link_transactions', arguments: { workspaceId } }));
    assert.equal(linked.counts.exact, 6);

    const calculated = structured(await client.callTool({ name: 'calculate_expected_tds', arguments: { workspaceId } }));
    assert.equal(calculated.totals.expectedPaise, 1_320_000);

    const reconciliation = structured(await client.callTool({ name: 'run_26as_reconciliation', arguments: { workspaceId } }));
    assert.equal(reconciliation.summary.recoverableGapPaise, 1_000_000);
    assert.deepEqual(
      Object.fromEntries(reconciliation.decisions.map((decision) => [decision.invoiceId, decision.status])),
      {
        'INV-1001': 'MATCHED',
        'INV-1002': 'MATCHED',
        'INT-FD-01': 'PAN_ERROR_SUSPECTED',
        'INV-2001': 'AMOUNT_MISMATCH',
        'INV-3001': 'SECTION_MISMATCH'
      }
    );

    const cases = structured(await client.callTool({ name: 'create_recovery_cases', arguments: { workspaceId } }));
    assert.equal(cases.cases.length, 3);

    const refreshed = structured(await client.callTool({
      name: 'verify_refreshed_26as',
      arguments: { workspaceId, form26asCsv: resource('08-form26as-refreshed.csv') }
    }));
    assert.equal(refreshed.resolvedCaseIds.length, 2);

    const malformed = await client.callTool({ name: 'link_transactions', arguments: {} });
    assert.equal(malformed.isError, true);
  } finally {
    await client.close();
    rmSync(dataDirectory, { recursive: true, force: true });
  }
});
