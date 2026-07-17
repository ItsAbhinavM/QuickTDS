# Quick TDS MCP Server

Quick TDS connects invoices, payments, bank receipts, and Form 26AS records to identify
documentary TDS credit gaps and track them until a refreshed statement resolves the case.

## Included Workflow

```text
Upload company data
-> Link invoices, payments, and bank receipts
-> Calculate configured expected TDS
-> Establish documentary withholding
-> Reconcile Form 26AS
-> Create recovery cases
-> Record deductor corrections
-> Upload refreshed Form 26AS
-> Verify resolution
```

The server persists each workspace under `data/workspaces/` when that directory is writable.
In read-only containers it falls back to temporary storage. Set `QUICK_TDS_DATA_DIR` only when
the platform has attached a writable persistent volume at that path. Startup performs a real
write check and stops with a configuration error if an explicitly configured directory is not
writable. This JSON store is appropriate for one server instance; it is not a concurrent
multi-instance database.

## Install

```bash
npm install
npm run install:all
cp .env.example .env
```

OAuth is disabled by default. See `OAUTH_SETUP.md` before enabling it.

## Run

Start the complete MCP server and widget development environment:

```bash
npm run dev
```

Wait for Next.js to report `Ready`, then open `http://127.0.0.1:3101`. The
MCP endpoint printed as `http://127.0.0.1:3100/mcp` is for MCP clients and keeps
an event-stream connection open; it is not the application web page. Browsing
to `http://127.0.0.1:3100` redirects to the UI during local development.

The browser UI is itself an MCP client. It can load the demo, call each workflow
tool, or import company metadata with the seven CSV templates under `fixtures/`.
Form 26AS CSV is supported; AIS and raw Form 16A/ledger PDF extraction are not
implemented and are shown as unsupported in the intake screen.

If the server runs in a container or remote VM, bind it externally with:

```bash
HOST=0.0.0.0 npm run dev
```

The development ports can be changed with `MCP_DEV_PORT` and `WIDGET_DEV_PORT`.

Run the MCP Inspector separately with:

```bash
npm run inspector
```

Build and start the production bundle:

```bash
npm run build
npm run start:prod
```

### NitroCloud Storage

NitroCloud's current public deployment flow does not show a persistent volume mount in its
generated container. Leave `QUICK_TDS_DATA_DIR` unset so the tools use writable temporary
storage. Do not set it to `/data/workspaces` unless NitroCloud support or the project dashboard
has actually attached a writable volume at `/data`.

If NitroCloud provides a volume, set the environment variable to its real mount path, for example:

```text
QUICK_TDS_DATA_DIR=<actual-volume-mount>/workspaces
```

A directory path in application code cannot create a cloud volume. Temporary storage allows
tool execution but can be lost on restart or scale-to-zero. Durable autoscaled deployment
requires shared database or object storage rather than this local JSON store.

Run only the widget frontend during UI work:

```bash
npm run widget -- run dev
```

Run validation:

```bash
npm test
npm run build
```

The test suite includes a full stdio MCP client run covering initialization,
tool discovery, the recovery workflow, refreshed Form 26AS, and invalid input.

## Demo Flow

Connect NitroStudio or another MCP client to the running server, then execute these tools
in order. The default demo workspace is `quick-motors-demo`.

1. `load_quick_tds_demo`
2. `link_transactions`
3. `calculate_expected_tds`
4. `run_26as_reconciliation`
5. `create_recovery_cases`
6. `record_tds_correction` when a deductor supplies a correction reference
7. `verify_refreshed_26as` with `useDemoFixture: true`
8. `get_tds_workspace` to inspect the final persisted state

A natural-language request that starts the demo is:

```text
Load the Quick TDS demo in workspace quick-motors-demo, link its transactions,
calculate expected TDS, reconcile Form 26AS, and create recovery cases.
```

To verify the demo corrections afterward:

```text
Verify workspace quick-motors-demo using the refreshed demo Form 26AS.
```

## Using Company Data

Call `upload_company_data` with a company object and the CSV contents described below.
The example files in `fixtures/` are directly reusable templates.

| Input | Template |
|---|---|
| Company | `fixtures/company.json` |
| Counterparties and TANs | `fixtures/counterparties.csv` |
| Bank accounts and deposits | `fixtures/bank-accounts.csv` |
| Invoices and interest events | `fixtures/invoices.csv` |
| Payments and documentary TDS | `fixtures/payments.csv` |
| Invoice/payment allocation | `fixtures/payment-allocations.csv` |
| Bank receipts | `fixtures/bank-transactions.csv` |
| Original Form 26AS | `fixtures/form26as.csv` |
| Refreshed Form 26AS | `fixtures/form26as-refreshed.csv` |

Uploading a dataset replaces that workspace. Use a different workspace ID for each legal
entity/PAN.

## What The App Calculates

The application maintains three separate amounts:

```text
Expected TDS             = uploaded TDS base x uploaded reviewed rate
Documented withholding   = TDS stated in payment evidence
Recoverable credit gap   = documented withholding - Form 26AS credit
```

Expected TDS is not an autonomous section or rate determination. The uploader supplies the
reviewed section, rate, eligible base, and applicability for each income record.

## Current Boundaries

- Form 16A can be represented as the payment evidence type; PDF extraction is not included.
- Wrong PAN is reported only as suspected when no TAN credit is visible.
- Deductor correction and TRACES references are recorded manually.
- The service does not log in to, scrape, or file anything on a government portal.
- Section 205/401 legal escalation, email automation, and production tax-rule updates are deferred.
