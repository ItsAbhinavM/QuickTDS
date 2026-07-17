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

The server persists each workspace under `data/workspaces/`. This local JSON store is
appropriate for the demo and one server process; it is not intended as production storage.

## Install

```bash
cd quicktds
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

Run only the widget frontend during UI work:

```bash
npm run widget -- run dev
```

Run validation:

```bash
npm test
npm run build
```

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
