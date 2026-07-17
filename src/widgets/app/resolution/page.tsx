'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import { EmptyState, formatMoney, Shell, StatusPill } from '../ui';

interface ResolutionOutput {
  workspaceId: string;
  changes: { added: string[]; removed: string[]; changed: string[] };
  summary: { recoverableGapPaise: number; observedPaise: number };
  cases: Array<{ id: string; counterpartyName: string; invoiceId: string; status: string; amountPaise: number }>;
  resolvedCaseIds: string[];
}

export default function Resolution() {
  const data = useWidgetSDK().getToolOutput<ResolutionOutput | string>();

  if (typeof data === 'string') {
    return (
      <Shell eyebrow="Error" title="Resolution failed to load">
        <section className="notice" style={{ borderLeft: '4px solid var(--red)', background: 'rgba(244, 63, 94, 0.05)', color: 'var(--red)' }}>
          <strong>Resolution Error</strong>
          <p style={{ margin: 0, fontSize: 13, textTransform: 'none' }}>{data}</p>
        </section>
      </Shell>
    );
  }

  if (!data || !data.summary) return <EmptyState message="Comparing Form 26AS snapshots…" />;

  return (
    <Shell eyebrow="Statement replay" title="Refreshed 26AS verified">
      <div className="resolution-banner">
        <span>{data.resolvedCaseIds.length}</span>
        <div><strong>cases resolved</strong><p>{formatMoney(data.summary.recoverableGapPaise)} remains at risk</p></div>
      </div>
      <div className="change-grid">
        <article><strong>{data.changes.added.length}</strong><span>Rows added</span>{data.changes.added.map((id) => <code key={id}>{id}</code>)}</article>
        <article><strong>{data.changes.changed.length}</strong><span>Rows changed</span>{data.changes.changed.map((id) => <code key={id}>{id}</code>)}</article>
        <article><strong>{data.changes.removed.length}</strong><span>Rows removed</span>{data.changes.removed.map((id) => <code key={id}>{id}</code>)}</article>
      </div>
      <section className="case-list mini">
        {data.cases.map((item) => <article key={item.id}><div><strong>{item.invoiceId}</strong><span>{item.counterpartyName}</span></div><div><StatusPill status={item.status} /><small>{formatMoney(item.amountPaise)}</small></div></article>)}
      </section>
      <p className="workspace-note">Workspace: <code>{data.workspaceId}</code></p>
    </Shell>
  );
}
