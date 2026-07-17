'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import { EmptyState, Shell } from '../ui';

interface UploadOutput {
  workspaceId: string;
  company: { name: string; pan: string; financialYear: string };
  imported: Record<string, number>;
  nextStep: string;
}

export default function UploadSummary() {
  const data = useWidgetSDK().getToolOutput<UploadOutput>();
  if (!data) return <EmptyState message="Validating company files…" />;

  return (
    <Shell eyebrow="Import register" title="Dataset accepted">
      <section className="notice good-notice">
        <strong>{data.company.name}</strong>
        <span>{data.company.financialYear} · PAN {data.company.pan.slice(0, 3)}••••{data.company.pan.slice(-2)}</span>
      </section>
      <div className="stat-grid compact">
        {Object.entries(data.imported).map(([label, count]) => (
          <article key={label}>
            <strong>{count}</strong>
            <span>{label.replaceAll(/([A-Z])/g, ' $1')}</span>
          </article>
        ))}
      </div>
      <section className="next-step"><span>Next</span><p>{data.nextStep}</p></section>
      <p className="workspace-note">Workspace: <code>{data.workspaceId}</code></p>
    </Shell>
  );
}
