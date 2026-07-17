import { useState, type ReactNode } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { useApp, useHostStyles, type McpUiToolResultNotification } from '@modelcontextprotocol/ext-apps/react';

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

function extractToolResult<T>(result: unknown): T | string | null {
  if (!result || typeof result !== 'object') return null;

  const output = result as McpUiToolResultNotification['params'];
  if (output.structuredContent) return output.structuredContent as T;

  const text = output.content
    ?.filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n');

  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text;
  }
}

export function useWidgetBridge<T>() {
  const sdk = useWidgetSDK();
  const sdkData = sdk.getToolOutput<T>();
  const [mcpData, setMcpData] = useState<T | string | null>(null);
  const { app, isConnected } = useApp({
    appInfo: { name: 'quick-tds-widgets', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        const data = extractToolResult<T>(result);
        if (data !== null) setMcpData(data);
      };
    }
  });
  useHostStyles(app, app?.getHostContext());

  async function callTool(name: string, args: Record<string, unknown>) {
    const result = isConnected && app
      ? await app.callServerTool({ name, arguments: args })
      : await sdk.callTool(name, args);
    const data = extractToolResult<T>(result);
    if (data !== null) setMcpData(data);
    return result;
  }

  return {
    data: mcpData !== null ? mcpData : (sdkData as T | string | null),
    callTool
  };
}
