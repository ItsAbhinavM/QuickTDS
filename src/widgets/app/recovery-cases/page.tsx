'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import { EmptyState, formatLabel, formatMoney, Shell, StatusPill } from '../ui';

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
  const data = useWidgetSDK().getToolOutput<{ workspaceId: string; cases: RecoveryCase[] }>();
  if (!data) return <EmptyState message="Opening recovery register…" />;

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
