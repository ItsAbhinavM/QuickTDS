import type { ReactNode } from 'react';

export function formatMoney(paise: number | undefined): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format((paise ?? 0) / 100);
}

export function Shell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand-mark">QT</div>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </header>
      {children}
      <footer>Quick TDS · Evidence before action</footer>
    </main>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === 'MATCHED' || status === 'RESOLVED'
    ? 'good'
    : status.includes('MISSING') || status.includes('PAN')
      ? 'bad'
      : 'warn';
  return <span className={`status ${tone}`}>{status.replaceAll('_', ' ')}</span>;
}

export function EmptyState({ message = 'Waiting for tool output…' }: { message?: string }) {
  return <div className="empty"><span className="spinner" />{message}</div>;
}
