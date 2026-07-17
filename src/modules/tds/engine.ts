import { createHash } from 'node:crypto';
import type {
  Form26AsRow,
  MatchStatus,
  ReconciliationDecision,
  ReconciliationSummary,
  TdsExpectation
} from './tds.types.js';

function decisionId(invoiceId: string, snapshotId: string): string {
  return `DEC-${createHash('sha256').update(`${invoiceId}:${snapshotId}`).digest('hex').slice(0, 12).toUpperCase()}`;
}

function emptyCounts(): Record<MatchStatus, number> {
  return {
    MATCHED: 0,
    PARTIALLY_MATCHED: 0,
    MISSING_CREDIT: 0,
    AMOUNT_MISMATCH: 0,
    SECTION_MISMATCH: 0,
    CROSS_PERIOD: 0,
    PAN_ERROR_SUSPECTED: 0,
    AMBIGUOUS: 0
  };
}

export function reconcile(
  expectations: TdsExpectation[],
  observedRows: Form26AsRow[],
  snapshotId: string
): { decisions: ReconciliationDecision[]; summary: ReconciliationSummary } {
  const available = new Map(observedRows.map((row) => [row.id, row.tdsPaise]));
  const decisions: ReconciliationDecision[] = [];

  const sorted = [...expectations].sort((a, b) =>
    `${a.tan}:${a.quarter}:${a.section}:${a.invoiceId}`.localeCompare(`${b.tan}:${b.quarter}:${b.section}:${b.invoiceId}`)
  );

  for (const expectation of sorted) {
    const exactRows = observedRows.filter((row) =>
      row.tan === expectation.tan && row.quarter === expectation.quarter && row.section === expectation.section
    );
    const sectionRows = observedRows.filter((row) =>
      row.tan === expectation.tan && row.quarter === expectation.quarter && row.section !== expectation.section
    );
    const crossPeriodRows = observedRows.filter((row) =>
      row.tan === expectation.tan && row.quarter !== expectation.quarter && row.section === expectation.section
    );

    let candidateRows = exactRows;
    let candidateType: 'EXACT' | 'SECTION' | 'CROSS' | 'NONE' = exactRows.length > 0 ? 'EXACT' : 'NONE';
    if (candidateType === 'NONE' && sectionRows.length > 0) {
      candidateRows = sectionRows;
      candidateType = 'SECTION';
    } else if (candidateType === 'NONE' && crossPeriodRows.length > 0) {
      candidateRows = crossPeriodRows;
      candidateType = 'CROSS';
    }

    let remaining = expectation.actualWithheldPaise;
    const usedRows: string[] = [];
    for (const row of candidateRows.sort((a, b) => a.id.localeCompare(b.id))) {
      const rowAvailable = available.get(row.id) ?? 0;
      if (remaining <= 0 || rowAvailable <= 0) continue;
      const allocated = Math.min(remaining, rowAvailable);
      remaining -= allocated;
      available.set(row.id, rowAvailable - allocated);
      usedRows.push(row.id);
    }

    const observedPaise = expectation.actualWithheldPaise - remaining;
    const creditGapPaise = Math.max(expectation.actualWithheldPaise - observedPaise, 0);
    const deductionGapPaise = Math.max(expectation.expectedPaise - expectation.actualWithheldPaise, 0);
    let status: MatchStatus;
    let explanation: string;

    if (deductionGapPaise > 0) {
      status = 'AMOUNT_MISMATCH';
      explanation = 'Documented withholding is lower than the configured expected TDS.';
    } else if (candidateType === 'SECTION' && observedPaise > 0) {
      status = 'SECTION_MISMATCH';
      explanation = 'Credit is visible for the TAN and quarter under a different section.';
    } else if (candidateType === 'CROSS' && observedPaise > 0) {
      status = 'CROSS_PERIOD';
      explanation = 'Credit is visible for the TAN under a different quarter.';
    } else if (observedPaise >= expectation.actualWithheldPaise) {
      status = 'MATCHED';
      explanation = 'Documented withholding is fully represented in Form 26AS.';
    } else if (observedPaise > 0) {
      status = 'PARTIALLY_MATCHED';
      explanation = 'Only part of the documented withholding is visible in Form 26AS.';
    } else if (!observedRows.some((row) => row.tan === expectation.tan)) {
      status = 'PAN_ERROR_SUSPECTED';
      explanation = 'No credit for this TAN is visible. Wrong PAN is one possible cause and requires deductor confirmation.';
    } else {
      status = 'MISSING_CREDIT';
      explanation = 'Documented withholding is not visible in the matching Form 26AS period.';
    }

    decisions.push({
      ...expectation,
      id: decisionId(expectation.invoiceId, snapshotId),
      status,
      observedPaise,
      creditGapPaise,
      deductionGapPaise,
      observedRowIds: usedRows,
      explanation,
      allocationBasis: usedRows.length > 0 ? 'TAN_QUARTER_SECTION_AGGREGATE' : 'NO_CANDIDATE'
    });
  }

  const counts = emptyCounts();
  decisions.forEach((decision) => { counts[decision.status] += 1; });
  const summary = decisions.reduce<ReconciliationSummary>((result, decision) => ({
    expectedPaise: result.expectedPaise + decision.expectedPaise,
    actualWithheldPaise: result.actualWithheldPaise + decision.actualWithheldPaise,
    observedPaise: result.observedPaise + decision.observedPaise,
    recoverableGapPaise: result.recoverableGapPaise + decision.creditGapPaise,
    deductionGapPaise: result.deductionGapPaise + decision.deductionGapPaise,
    counts
  }), {
    expectedPaise: 0,
    actualWithheldPaise: 0,
    observedPaise: 0,
    recoverableGapPaise: 0,
    deductionGapPaise: 0,
    counts
  });

  return { decisions, summary };
}
