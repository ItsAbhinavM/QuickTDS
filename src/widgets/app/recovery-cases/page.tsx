'use client';

import { EmptyState, formatLabel, formatMoney, Shell, StatusPill, useWidgetBridge } from '../ui';

interface RecoveryCase {
  id: string;
  invoiceId: string;
  counterpartyName: string;
  tan: string;
  issue: string;
  amountPaise: number;
  status: string;
  correctionReference?: string;
}

export default function RecoveryCases() {
  const { data } = useWidgetBridge<{ workspaceId: string; cases: RecoveryCase[] }>();

  if (typeof data === 'string') {
    return (
      <Shell eyebrow="Error" title="Cases failed to load">
        <section className="notice" style={{ borderLeft: '4px solid var(--red)', background: 'rgba(244, 63, 94, 0.05)', color: 'var(--red)' }}>
          <strong>Recovery Register Error</strong>
          <p style={{ margin: 0, fontSize: 13, textTransform: 'none' }}>{data}</p>
        </section>
      </Shell>
    );
  }

  if (!data || !data.cases) return <EmptyState message="Opening recovery register…" />;

  return (
    <Shell eyebrow="Recovery register" title={`${data.cases.length} cases require attention`}>
      <section className="case-list">
        {data.cases.map((item, index) => (
          <article key={item.id}>
            <div className="case-index">{String(index + 1).padStart(2, '0')}</div>
            <div className="case-main">
              <div><p className="eyebrow">{item.invoiceId} · {item.tan}</p><h2>{item.counterpartyName}</h2></div>
              <StatusPill status={item.status} />
              <dl><div><dt>Issue</dt><dd>{formatLabel(item.issue)}</dd></div><div><dt>Amount</dt><dd>{formatMoney(item.amountPaise)}</dd></div><div><dt>Case ID</dt><dd>{item.id}</dd></div></dl>
              {item.correctionReference && <p className="correction">Correction reference: <strong>{item.correctionReference}</strong></p>}
            </div>
          </article>
        ))}
      </section>
      <section className="next-step"><span>Action</span><p>Contact the deductor outside the system, then use <code>record_tds_correction</code> with the case ID.</p></section>
    </Shell>
  );
}
