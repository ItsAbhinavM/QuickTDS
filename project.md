# TDS Credit Rescue Rail

## Product Specification

**Hackathon scope:** 24-48 hours  
**Target user:** Finance teams and CAs serving Indian businesses  
**Core job:** Detect, evidence, route, and track missing or mismatched TDS credits  
**Not included:** Tax calculation, return filing, legal advice, or generic tax Q&A

## 1. Product Thesis

Businesses record TDS withheld by customers, but the corresponding credit may be missing,
delayed, or incorrectly reported in Form 26AS. Resolving the issue requires finance teams
to repeatedly search ledgers, invoices, bank receipts, payment advice, certificates, tax
statements, and old emails.

TDS Credit Rescue Rail converts that fragmented investigation into a controlled recovery
workflow:

```text
Detect gap -> prove gap -> select recovery route -> obtain approval
-> contact deductor -> track case -> verify resolution
```

### USP

> Turn every unexplained TDS credit gap into a source-backed, send-ready recovery case,
> and follow it until the credit appears or the case requires professional escalation.

The product does not merely compare two totals. It creates a persistent case with
deterministic matching, evidence provenance, approval-bound actions, and resolution
tracking.

## 2. Creative Differentiator: TDS Credit Passport

Every unresolved credit receives a **TDS Credit Passport**. This is a portable evidence
graph rather than a generated paragraph.

The passport contains:

- Expected TDS entry from the business ledger.
- Related invoice, payment advice, and bank receipt.
- TDS currently visible in the supplied Form 26AS export.
- Supporting Form 16A or other certificate, when available.
- Exact reconciliation rule and algorithm version.
- Verified facts, inferred links, and unresolved contradictions.
- Deductor communication and acknowledgement IDs.
- Current recovery state and next permitted action.
- Source hashes so every figure can be traced to the original file.

The passport can be shared with the deductor, reviewed by a CA, or used to prepare an
evidence-based grievance or demand response. It is not a legal filing and does not claim
government acceptance.

### Why This Is More Than an LLM

A normal LLM cannot safely:

- Read current private accounting and tax records without tools.
- Guarantee that an amount was matched only once.
- Maintain a recovery case over several weeks or quarters.
- Prove which source row supports each conclusion.
- Send an approved communication and retain its external message ID.
- Compare a refreshed statement and deterministically confirm resolution.

The LLM may explain and draft. Code performs reconciliation, state transitions,
calculations, access control, and audit logging.

## 3. Users and Business Value

### Primary User

A finance controller at an Indian SME that has many customers deducting TDS from its
payments.

### Secondary User

A CA or accounting firm managing reconciliation cases for several consenting clients.
Each client's data must remain isolated. The MVP must not compare one client's records
with another client's records.

### Business Impact

The system measures:

```text
Potential credit at risk =
sum of documentary TDS amounts not reconciled with supplied Form 26AS records
```

This is an operational exposure estimate. It is not a guaranteed credit, refund, tax
saving, or final tax liability.

## 4. Correct Operating Model

- The payer/deductor files the TDS statement, not the recipient/deductee.
- Ordinary TDS statements are generally filed quarterly; deduction and deposit events
  follow their own applicable timelines.
- Form 26AS is the principal government tax-credit record used by this product.
- AIS provides useful supporting information but does not replace Form 26AS credit.
- Only the deductor can ordinarily correct its TAN-based TDS statement.
- There is no single form that a deductee can file to force missing TDS into Form 26AS.
- Form 26A is not a missing-credit rescue form for the deductee.

For periods governed by the Income-tax Act, 1961, Section 205 generally bars direct
recovery from the deductee to the extent tax was actually deducted. For tax year 2026-27
onward, the corresponding provision is Section 401 of the Income-tax Act, 2025. This is a
defence against duplicate recovery, not an automatic credit-entry mechanism.

## 5. Input Evidence

| Input | Role | MVP format |
|---|---|---|
| TDS receivable ledger | Expected credit | CSV |
| Invoice register | Commercial reference | CSV |
| Payment advice | Evidence of gross amount and withholding | CSV or PDF fixture |
| Bank statement | Evidence of net receipt | CSV |
| Form 26AS export | Observed tax credit | CSV fixture |
| AIS export | Supporting information | JSON or CSV fixture |
| Form 16A index | Supporting certificate evidence | CSV or PDF fixture |
| Contact directory | Deductor follow-up recipient | CSV |
| Refreshed Form 26AS | Resolution evidence | CSV fixture |

Production government APIs are not assumed. The demo must clearly describe these as
user-provided exports or synthetic fixtures.

## 6. Fact and Trust Model

Every material value must be classified.

### Verified Fact

Directly present in a source or produced through deterministic arithmetic.

Examples:

- Ledger row `L-102` records TDS of INR 18,000.
- Form 26AS row `C-202` records INR 16,000 for the same TAN.
- The arithmetic difference is INR 2,000.

### Inferred Fact

A plausible relationship that is not directly proven.

Examples:

- Two differently formatted names may represent the same deductor.
- One quarterly credit may cover multiple invoices.
- A cross-quarter match may represent delayed reporting.

Every inference stores its rule, supporting evidence, confidence, competing candidates,
and required human decision.

### Abstention

The engine must return `ABSTAINED` instead of guessing when:

- TAN is absent and identity is ambiguous.
- Multiple candidate combinations satisfy the same rule.
- Dates or amounts cannot be parsed safely.
- Source files contradict one another.
- The cause requires tax or legal interpretation.
- Evidence does not establish that tax was actually deducted.

## 7. Recovery Scenarios

| Scenario | Detection | Recommended route |
|---|---|---|
| Exact match | Same TAN, amount, and compatible period | Mark reconciled |
| Filing period still open | Credit absent before normal filing/processing cycle | Monitor; do not accuse deductor |
| Credit missing | Documentary withholding with no candidate in Form 26AS | Ask deductor to verify deposit and statement |
| Wrong amount | Same TAN but different amount | Send amount-specific correction packet |
| Wrong PAN or omitted row | Evidence exists but credit is absent | Ask deductor to correct deductee details |
| Challan mismatch | Deductor confirms deposit but credit remains absent | Request correction acknowledgement or challan review |
| Cross-quarter candidate | Same TAN and amount in another period | Human confirmation before linking |
| Aggregate credit | Unique sum of several ledger entries equals one credit | Human-approved aggregate match |
| TDS deducted but not deposited | Evidence supports actual deduction | Preserve evidence; request deposit/correction; prepare escalation pack |
| No actual deduction | Records show gross payment without withholding | Do not invoke Section 205/401 |
| Existing tax demand | Missing credit contributes to a demand | Prepare evidence for CA-reviewed response/rectification route |
| Ambiguous identity | Name similarity without reliable TAN | Abstain and request identity evidence |

The system recommends a route. It does not accuse the deductor, update Form 26AS, submit
a correction statement, or guarantee recovery.

## 8. Deterministic Reconciliation Algorithm

### Normalization

Original values are never overwritten.

```text
TAN: uppercase, remove spaces, validate shape
Invoice: uppercase, remove configured separators
Amount: parse decimal and preserve source sign
Date: parse only with an explicitly configured format
Name: uppercase and collapse whitespace for candidate discovery only
```

A shape-valid TAN does not prove ownership. Fuzzy names never produce an automatic
verified match.

### Matching Tiers

Rules run in order. A lower tier cannot override a unique higher-tier result.

| Tier | Conditions | Result |
|---|---|---|
| 1 | Exact TAN, exact amount, same period | `VERIFIED_MATCH` |
| 2 | Exact TAN, exact amount, configured date tolerance | `VERIFIED_MATCH` |
| 3 | Exact TAN, one unique combination sums to observed amount | `PROPOSED_AGGREGATE_MATCH` |
| 4 | Exact TAN and amount outside period window | `PROPOSED_CROSS_PERIOD_MATCH` |
| 5 | Exact TAN with differing amount | `AMOUNT_MISMATCH` |
| 6 | Missing TAN, unique approved alias and exact amount | `INFERRED_IDENTITY_MATCH` |
| 7 | No unique candidate | `UNMATCHED` or `ABSTAINED` |

### Matching Guardrails

- Default amount tolerance is INR 0.01.
- One source entry cannot be consumed by two accepted matches.
- Automatic matches require a unique candidate.
- Aggregate search is limited to four ledger entries in the MVP.
- Aggregate matches must have exactly one valid combination.
- Cross-period and identity matches always require human approval.
- Algorithm version and rule ID are stored with every decision.

### Example Output

```json
{
  "decision_id": "D-009",
  "status": "AMOUNT_MISMATCH",
  "expected_record_ids": ["ledger:L-102"],
  "observed_record_ids": ["form26as:C-202"],
  "verified": {
    "tan_equal": true,
    "expected_amount": "18000.00",
    "observed_amount": "16000.00",
    "difference": "2000.00"
  },
  "inferred": [],
  "rule_id": "R5_EXACT_TAN_DIFFERENT_AMOUNT",
  "algorithm_version": "1.0.0"
}
```

## 9. Evidence Graph

### Node Types

```text
SourceFile
SourceRow
NormalizedRecord
VerifiedFact
InferredFact
ReconciliationDecision
CreditPassport
HumanApproval
OutboundMessage
ResolutionEvidence
```

### Edge Types

```text
EXTRACTED_FROM
NORMALIZED_FROM
SUPPORTS
CONTRADICTS
INFERRED_BY
DECIDED_BY
INCLUDED_IN
APPROVED_BY
SENT_AS
RESOLVED_BY
```

Every decision exposes the source filename, row number, SHA-256 file hash, original and
normalized values, algorithm version, timestamp, and human overrides.

## 10. Case State Machine

```text
DETECTED
  -> NEEDS_REVIEW
  -> READY_TO_DRAFT
  -> DRAFTED
  -> APPROVAL_REQUIRED
  -> APPROVED
  -> SENT
  -> AWAITING_RESPONSE
  -> RESOLVED
```

Exception states:

```text
NEEDS_MORE_EVIDENCE
ABSTAINED
REJECTED
CANCELLED
CLOSED_UNRESOLVED
```

No tool may transition directly from `DRAFTED` to `SENT`. Approval must bind the exact
recipient, attachment list, and draft hash. Any change invalidates approval.

## 11. MCP Interface

### Tools

| Tool | Purpose |
|---|---|
| `ingest_tds_exports` | Validate files, hash sources, and create normalized datasets |
| `run_credit_reconciliation` | Produce deterministic matches, mismatches, and abstentions |
| `explain_reconciliation` | Return rules, evidence, excluded candidates, and provenance |
| `create_credit_passport` | Open a persistent recovery case from a decision |
| `recommend_recovery_route` | Select the next permitted workflow from verified case state |
| `draft_deductor_request` | Draft a neutral evidence-based communication |
| `approve_case_action` | Bind human approval to exact content and recipient |
| `send_test_communication` | Send through a sandbox email adapter after approval |
| `record_deductor_response` | Attach acknowledgement or requested evidence |
| `reconcile_refreshed_26as` | Test whether a later export resolves an open case |
| `get_credit_at_risk` | Summarize unresolved documentary exposure |

### Resources

```text
tds-rescue://datasets/{dataset_id}
tds-rescue://reconciliations/{run_id}
tds-rescue://decisions/{decision_id}/provenance
tds-rescue://passports/{case_id}
tds-rescue://passports/{case_id}/evidence
tds-rescue://policies/reconciliation
tds-rescue://policies/approval
tds-rescue://rules/{tax_year}
```

### Prompts

```text
review_credit_gap
prepare_neutral_followup
summarize_case_for_controller
challenge_unsupported_match
```

`challenge_unsupported_match` is a deliberate red-team prompt. It asks the model to find
unsupported assumptions before a human approves an action. It cannot alter the
deterministic result.

## 12. Communication Template

```text
Subject: Request to verify TDS credit details for {{period}} | {{case_id}}

Hello {{recipient_name}},

Our reconciliation identified a difference between our records and the Form 26AS
export supplied to our system for {{period}}.

Verified details:
- TAN: {{masked_tan}}
- Reference: {{invoice_or_ledger_reference}}
- TDS recorded in our ledger: INR {{expected_amount}}
- Credit observed in the supplied export: INR {{observed_amount_or_none}}
- Difference: INR {{difference}}

Could you please verify the deposit and statement status and share any relevant
certificate or correction acknowledgement?

This message reports a reconciliation difference only and does not make a tax or
legal determination.

Regards,
{{sender_name}}
```

The model can improve tone but cannot alter verified amounts or references.

## 13. Privacy and Security

- Parse and reconcile locally.
- Use synthetic records and `.test` email addresses in the demo.
- Store normalized data and case state in SQLite for the MVP.
- Keep source files outside public web roots.
- Bind the MCP server to localhost by default.
- Mask PAN, TAN, email, and bank references in logs and summaries.
- Send only minimum selected facts to the LLM.
- Never collect tax-portal passwords, OTPs, or production credentials.
- Do not scrape CAPTCHA-protected government portals.
- Require human approval for recipients, attachments, and exact message content.
- Use a local SMTP sink, Ethereal, Mailtrap, or equivalent test mailbox.

The privacy parser is supporting infrastructure, not the product USP.

## 14. MVP Demo Dataset

| Ledger record | Observed record | Expected outcome |
|---|---|---|
| Same TAN and INR 10,000 | Same TAN and INR 10,000 | Exact match |
| Same TAN and INR 18,000 | Same TAN and INR 16,000 | INR 2,000 mismatch |
| INR 7,500 + INR 2,500 | One INR 10,000 credit | Aggregate proposal |
| Missing TAN and INR 12,000 | Similar name and INR 12,000 | Abstain |
| Same TAN and INR 9,000 in Q1 | INR 9,000 appears in Q2 | Cross-period proposal |
| Documentary INR 40,000 withholding | No observed credit | Missing-credit passport |

For the final case, the demo later imports a refreshed Form 26AS fixture containing the
INR 40,000 credit. The system links the new row to the passport and transitions the case
to `RESOLVED`.

## 15. Four-Minute Demo

1. Ask: `Find TDS credits that appear missing and prepare the safest next action.`
2. Import synthetic ledger and Form 26AS exports.
3. Show exact, mismatched, aggregate, cross-period, and abstained results.
4. Open the INR 40,000 TDS Credit Passport.
5. Trace the amount to the invoice, payment advice, bank receipt, and missing credit row.
6. Show the recommended deductor-correction route without alleging fault.
7. Generate a neutral email and approve its exact content hash.
8. Send it to a test mailbox and display the external message ID.
9. Attempt to resend and show duplicate/action-state protection.
10. Import the refreshed Form 26AS fixture and show the passport closing as resolved.

### Closing Line

> We are not another tax chatbot. We turn missing TDS into an auditable recovery case,
> take the next approved action, and prove when the credit is finally resolved.

## 16. MVP Scope

### Build

- One ledger CSV schema.
- One Form 26AS-style CSV fixture schema.
- Deterministic matching tiers and abstention.
- TDS Credit Passport evidence graph.
- Persistent case state machine.
- Human-approved sandbox email.
- Refreshed-statement resolution replay.
- Source hashing and masked logs.

### Do Not Build

- Generic TDS calculator.
- ITR filing or tax-portal automation.
- TDS rate or section determination.
- Cross-client benchmarking.
- Tax payable calculation.
- Autonomous legal escalation.
- Government portal scraping.
- Blockchain.
- Broad GST or Income Tax publication monitoring in the MVP.

## 17. Stretch Goals

### Rule Change Watcher

Monitor allowlisted official CBDT or Income Tax sources, store signed snapshots, detect a
change relevant to the reconciliation rules, and open a human-reviewed policy update.
It must not automatically convert regulatory prose into production legal logic.

### Deductor Reliability Timeline

Measure correction latency and recurrence using only the current company's own cases.
Do not compare unrelated clients or create an external reputation score.

### Evidence Completeness Score

Show which evidence is present or missing. This is not an AI confidence score and must
not be presented as probability of legal success.

## 18. Success Metrics

- Potential documentary credit at risk identified.
- Median time from import to approved follow-up.
- Percentage of cases with complete source provenance.
- Percentage of ambiguous cases correctly abstained.
- Percentage of cases resolved in refreshed statements.
- Zero messages sent without valid approval.
- Zero source rows consumed twice by accepted matches.

Do not report "money recovered" unless refreshed official records or reviewed evidence
demonstrates resolution.

## 19. Judge Objections

| Objection | Answer |
|---|---|
| Is this just a CSV matcher? | Matching starts the workflow; the product creates an evidence passport, routes recovery, executes an approved action, and verifies resolution. |
| Why MCP? | MCP lets an assistant discover evidence, deterministic decisions, persistent cases, and guarded actions without giving the LLM authority over arithmetic or state. |
| Can the LLM hallucinate a credit? | Matches are produced by versioned code. Inference is labeled, provenance is mandatory, and ambiguity causes abstention. |
| Can you update Form 26AS? | No. The product asks the deductor to correct its statement and tracks supplied records until the result appears. |
| Do you need government APIs? | No. The MVP uses user-authorized exports and synthetic fixtures. |
| Does Section 205 guarantee credit? | No. Section 205/Section 401 concerns direct recovery where tax was actually deducted; it does not automatically create a credit entry. |
| Why not compare every client's data? | Client isolation is a privacy boundary. The product only evaluates evidence within the consenting client's workspace. |

## 20. Implementation Plan

### First 24 Hours

| Hours | Deliverable |
|---|---|
| 0-3 | Freeze schemas, case states, and demo fixtures |
| 3-8 | Build ingestion, validation, normalization, and hashing |
| 8-13 | Implement matching tiers, exclusivity, aggregate search, and abstention |
| 13-17 | Persist decisions, evidence graph, and passports |
| 17-21 | Expose MCP tools and resources |
| 21-24 | Add case transitions, draft generation, and test email |

### Additional 24 Hours

| Hours | Deliverable |
|---|---|
| 24-29 | Add refreshed-statement resolution replay |
| 29-34 | Build evidence graph visualization |
| 34-39 | Add privacy controls and redacted logging |
| 39-44 | Add deterministic and state-transition tests |
| 44-48 | Rehearse demo, prepare fallback, and freeze build |

### Critical Tests

- Exact TAN and amount produce one unique match.
- Duplicate candidates cause abstention.
- Ambiguous dates are rejected.
- Aggregate matching accepts only one unique combination.
- A row cannot be consumed twice.
- Inferred identity never becomes verified automatically.
- Draft changes invalidate prior approval.
- Sending without approval fails closed.
- Re-imported evidence closes only the correct case.
- Every decision resolves to original source rows.

## 21. Safe Product Language

Use:

> We detected a potential difference between documentary TDS withheld and TDS currently
> reflected in the supplied government-record export.

> We help reconcile evidence, request deductor verification or correction, track the
> case, and prepare material for professional review where needed.

Do not claim:

- Guaranteed credit, recovery, refund, or tax saving.
- Authority to update Form 26AS.
- The deductee can revise the deductor's TDS statement.
- AIS feedback automatically corrects Form 26AS.
- Section 205 or Section 401 automatically grants the missing credit.
- Form 26A is a deductee missing-credit claim form.
- Government, TRACES, or Income Tax Department affiliation.

## 22. Authoritative References

- [TRACES deductor tutorials and correction workflows](https://contents.tdscpc.gov.in/en/e-tutorial-deductor.html)
- [TRACES Form 26AS FAQ](https://contents.tdscpc.gov.in/en/faq-taxpayer-26AS-general.html)
- [Income Tax rectification guidance](https://www.incometax.gov.in/iec/foportal/help/how-to-perform-rectification)
- [Income Tax grievance guidance](https://www.incometax.gov.in/iec/foportal/help/how-to-raise-grievances-UM)
- [Income-tax Act, 1961, Section 205](https://incometaxindia.gov.in/Acts/Income-tax%20Act,%201961/2018/102120000000071113.htm)
- [Income-tax Act, 2025, as amended by Finance Act 2026](https://incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf)
- [Income Tax Act, 2025 transition guidance](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/objective-and-scope-new-act)

Tax procedures and forms must be revalidated before a production release. A CA should
review the legal workflow and all public demo claims.
