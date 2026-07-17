import type { ReactNode } from 'react';

const displayTerms: Record<string, string> = {
  ais: 'AIS',
  csv: 'CSV',
  form26as: 'Form 26AS',
  id: 'ID',
  inr: 'INR',
  pan: 'PAN',
  sha256: 'SHA-256',
  tan: 'TAN',
  tds: 'TDS',
  '26as': '26AS'
};

export function formatLabel(value: string): string {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => displayTerms[word.toLowerCase()] || `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

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
  const tone = status === 'MATCHED' || status === 'RESOLVED' || status === 'EXACT'
    ? 'good'
    : status.includes('MISSING') || status.includes('PAN') || status === 'UNMATCHED'
      ? 'bad'
      : 'warn';
  return <span className={`status ${tone}`}>{formatLabel(status)}</span>;
}

export function EmptyState({ message = 'Waiting for tool output…' }: { message?: string }) {
  return <div className="empty"><span className="spinner" />{message}</div>;
}
