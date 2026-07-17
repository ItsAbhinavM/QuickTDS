'use client';

import { useState } from 'react';
import { EmptyState, formatMoney, Shell, StatusPill, useWidgetBridge } from '../ui';

interface Decision {
  id: string;
  invoiceId: string;
  counterpartyName: string;
  tan: string;
  quarter: string;
  section: string;
  transactionType: string;
  expectedPaise: number;
  actualWithheldPaise: number;
  observedPaise: number;
  creditGapPaise: number;
  deductionGapPaise: number;
  status: string;
  explanation: string;
}

interface Output {
  workspaceId: string;
  company: { name: string; financialYear: string };
  summary: {
    expectedPaise: number;
    actualWithheldPaise: number;
    observedPaise: number;
    recoverableGapPaise: number;
    deductionGapPaise: number;
  } | null;
  decisions: Decision[];
}

export default function Reconciliation() {
  const { data } = useWidgetBridge<Output>();
  const [status, setStatus] = useState('ALL');
  const [counterparty, setCounterparty] = useState('ALL');

  if (typeof data === 'string') {
    return (
      <Shell eyebrow="Error" title="Ledger failed to load">
        <section className="notice" style={{ borderLeft: '4px solid var(--red)', background: 'rgba(244, 63, 94, 0.05)', color: 'var(--red)' }}>
          <strong>Reconciliation Error</strong>
          <p style={{ margin: 0, fontSize: 13, textTransform: 'none' }}>{data}</p>
        </section>
      </Shell>
    );
  }

  if (!data || !data.summary) return <EmptyState message="Preparing reconciliation ledger…" />;

  const counterparties = [...new Set(data.decisions.map((item) => item.counterpartyName))];
  const visible = data.decisions.filter((item) =>
    (status === 'ALL' || item.status === status) &&
    (counterparty === 'ALL' || item.counterpartyName === counterparty)
  );

  return (
    <Shell eyebrow={`${data.company.financialYear} reconciliation`} title={data.company.name}>
      <div className="stat-grid">
        <article><span>Expected TDS</span><strong>{formatMoney(data.summary.expectedPaise)}</strong></article>
        <article><span>Documented withheld</span><strong>{formatMoney(data.summary.actualWithheldPaise)}</strong></article>
        <article><span>Visible in 26AS</span><strong>{formatMoney(data.summary.observedPaise)}</strong></article>
        <article className="risk"><span>Credit at risk</span><strong>{formatMoney(data.summary.recoverableGapPaise)}</strong></article>
      </div>
      <section className="toolbar">
        <div><label htmlFor="status">Issue</label><select id="status" value={status} onChange={(event) => setStatus(event.target.value)}><option>ALL</option>{[...new Set(data.decisions.map((item) => item.status))].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div><label htmlFor="counterparty">Deductor</label><select id="counterparty" value={counterparty} onChange={(event) => setCounterparty(event.target.value)}><option>ALL</option>{counterparties.map((item) => <option key={item}>{item}</option>)}</select></div>
        <span>{visible.length} records</span>
      </section>
      <section className="table-wrap">
        <table>
          <thead><tr><th>Reference</th><th>Deductor</th><th className="number">Expected</th><th className="number">Withheld</th><th className="number">26AS</th><th className="number">Difference</th><th>Status</th></tr></thead>
          <tbody>{visible.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.invoiceId}</strong><small>{item.quarter} · {item.section}</small></td>
              <td>{item.counterpartyName}<small>{item.tan}</small></td>
              <td className="number">{formatMoney(item.expectedPaise)}</td>
              <td className="number">{formatMoney(item.actualWithheldPaise)}</td>
              <td className="number">{formatMoney(item.observedPaise)}</td>
              <td className="number difference">{formatMoney(Math.max(item.creditGapPaise, item.deductionGapPaise))}</td>
              <td><StatusPill status={item.status} /><small className="explanation">{item.explanation}</small></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <p className="workspace-note">Workspace: <code>{data.workspaceId}</code></p>
    </Shell>
  );
}
