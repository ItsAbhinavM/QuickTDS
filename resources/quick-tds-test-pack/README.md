# Quick TDS Frontend Test Pack

This directory contains one coherent company dataset in the exact seven CSV
schemas accepted by the frontend and the `upload_company_data` MCP tool.

## Start The App

From the repository root:

```bash
npm run dev
```

Open `http://localhost:3101`, scroll to **Structured data intake**, and enter:

| Field | Value |
|---|---|
| Workspace ID | `mock-data-validation` |
| Company name | `Quick Motors Private Limited` |
| PAN | `AAAAA1234A` |
| Financial year | `2025-26` |

Do not click **Run complete demo** for this test. Select these files:

| Frontend input | File |
|---|---|
| Counterparties | `01-counterparties.csv` |
| Bank accounts | `02-bank-accounts.csv` |
| Invoice ledger | `03-invoice-ledger.csv` |
| Payments and Form 16A evidence | `04-payments.csv` |
| Payment allocations | `05-payment-allocations.csv` |
| Bank transactions | `06-bank-transactions.csv` |
| Form 26AS | `07-form26as-original.csv` |

Click **Validate and import dataset**, then run the workflow buttons in order:

1. Connect
2. Calculate
3. Reconcile
4. Recover
5. Inspect

The result panel shows the latest MCP response. Run **Reconcile** again whenever
you want to compare its full decision list with the expected values below.

## Expected Import And Linking

| Result | Expected |
|---|---:|
| Counterparties | 4 |
| Bank accounts | 3 |
| Invoices | 5 |
| Payments | 6 |
| Payment allocations | 6 |
| Bank transactions | 6 |
| Form 26AS rows | 3 |
| Exact bank links | 6 |
| Proposed bank links | 0 |
| Unmatched bank links | 0 |

## Expected Calculation

The MCP JSON uses paise. The frontend currency values are rupees.

| Total | Rupees | Paise in MCP JSON |
|---|---:|---:|
| Configured expected TDS | Rs 13,200.00 | 1,320,000 |
| Documented withholding | Rs 13,000.00 | 1,300,000 |

## Expected Original Reconciliation

| Total | Rupees | Paise in MCP JSON |
|---|---:|---:|
| Visible Form 26AS credit allocated | Rs 3,000.00 | 300,000 |
| Recoverable credit gap | Rs 10,000.00 | 1,000,000 |
| Deduction gap | Rs 200.00 | 20,000 |

Expected status counts:

| Status | Count |
|---|---:|
| `MATCHED` | 2 |
| `AMOUNT_MISMATCH` | 1 |
| `SECTION_MISMATCH` | 1 |
| `PAN_ERROR_SUSPECTED` | 1 |
| All other statuses | 0 |

Expected invoice decisions:

| Invoice | Expected | Withheld | Observed | Credit gap | Deduction gap | Status |
|---|---:|---:|---:|---:|---:|---|
| `INV-1001` | Rs 1,000 | Rs 1,000 | Rs 1,000 | Rs 0 | Rs 0 | `MATCHED` |
| `INV-1002` | Rs 500 | Rs 500 | Rs 500 | Rs 0 | Rs 0 | `MATCHED` |
| `INT-FD-01` | Rs 10,000 | Rs 10,000 | Rs 0 | Rs 10,000 | Rs 0 | `PAN_ERROR_SUSPECTED` |
| `INV-2001` | Rs 900 | Rs 700 | Rs 700 | Rs 0 | Rs 200 | `AMOUNT_MISMATCH` |
| `INV-3001` | Rs 800 | Rs 800 | Rs 800 | Rs 0 | Rs 0 | `SECTION_MISMATCH` |

The recovery register should contain three `NEEDS_REVIEW` cases:

| Invoice | Issue | Case amount |
|---|---|---:|
| `INT-FD-01` | `PAN_ERROR_SUSPECTED` | Rs 10,000 |
| `INV-2001` | `AMOUNT_MISMATCH` | Rs 200 |
| `INV-3001` | `SECTION_MISMATCH` | Rs 800 |

When the workspace ID is exactly `mock-data-validation`, the deterministic case
IDs are `CASE-D4D7F2FC40DB`, `CASE-206D15687E1F`, and `CASE-BDF97D21E4A0` in
the same order as the table.

## Optional Refreshed Form 26AS Check

`08-form26as-refreshed.csv` is not one of the seven initial upload files. Pass
its text to `verify_refreshed_26as` as `form26asCsv` using the MCP Inspector.

Expected refreshed result:

| Result | Expected |
|---|---|
| Added row | `26AS-HORIZON-Q1` |
| Changed row | `26AS-NOVA-Q2` |
| Removed rows | None |
| Matched decisions | 4 |
| Remaining amount mismatch | 1 (`INV-2001`) |
| Recoverable credit gap | Rs 0 |
| Remaining deduction gap | Rs 200 |
| Resolved cases | `INT-FD-01`, `INV-3001` |
| Case still needing review | `INV-2001` |

## Why The Source Mock CSV Is Not Uploaded Directly

`../MOCK_DATA (7).csv` combines unrelated companies and includes duplicate
invoice numbers, mixed date formats, precomputed statuses, and fields that do
not map one-to-one to the application's normalized records. This test pack uses
the same kind of TDS, customer, invoice, payment, bank, and Form 26AS data, but
keeps references internally consistent so the expected answer is reproducible.
