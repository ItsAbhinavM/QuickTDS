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
  const data = useWidgetSDK().getToolOutput<ResolutionOutput>();
  if (!data) return <EmptyState message="Comparing Form 26AS snapshots…" />;

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
