'use client';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { FormEvent, useEffect, useRef, useState } from 'react';

const files = [
  ['counterpartiesCsv', 'Counterparties', 'counterparties.csv'],
  ['bankAccountsCsv', 'Bank accounts', 'bank-accounts.csv'],
  ['invoicesCsv', 'Invoice ledger', 'invoices.csv'],
  ['paymentsCsv', 'Payments and Form 16A evidence', 'payments.csv'],
  ['allocationsCsv', 'Payment allocations', 'payment-allocations.csv'],
  ['bankTransactionsCsv', 'Bank transactions', 'bank-transactions.csv'],
  ['form26asCsv', 'Form 26AS', 'form26as.csv']
] as const;

const workflow = [
  ['link_transactions', 'Connect', 'Link payments, invoices and bank receipts.'],
  ['calculate_expected_tds', 'Calculate', 'Calculate reviewed expected and documented TDS.'],
  ['run_26as_reconciliation', 'Reconcile', 'Compare documentary withholding with Form 26AS.'],
  ['create_recovery_cases', 'Recover', 'Create persistent cases for unresolved credits.'],
  ['get_tds_workspace', 'Inspect', 'Read the complete persisted workspace state.']
] as const;

interface ToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

function toolOutput(rawResult: Awaited<ReturnType<Client['callTool']>>): unknown {
  const result = rawResult as ToolResult;
  const text = result.content.find((item) => item.type === 'text');
  if (result.isError) throw new Error(text?.text || 'MCP tool failed');
  if (result.structuredContent) return result.structuredContent;
  if (text?.type !== 'text') return result.content;
  try {
    return JSON.parse(text.text || 'null');
  } catch {
    return text.text;
  }
}

async function connectMcpClient(): Promise<Client> {
  const client = new Client({ name: 'quick-tds-browser', version: '1.0.0' });
  const port = process.env.NEXT_PUBLIC_MCP_PORT || '3100';
  const endpoint = new URL(`${window.location.protocol}//${window.location.hostname}:${port}/mcp`);
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  return client;
}

export default function Home() {
  const clientRef = useRef<Client | null>(null);
  const reconnectRef = useRef<Promise<Client> | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [workspaceId, setWorkspaceId] = useState('quick-motors-demo');
  const [company, setCompany] = useState({ name: '', pan: '', financialYear: '2025-26' });
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [running, setRunning] = useState('');
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    connectMcpClient().then((client) => {
      if (cancelled) return client.close();
      clientRef.current = client;
      setConnection('connected');
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setConnection('offline');
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    });

    return () => {
      cancelled = true;
      reconnectRef.current = null;
      const client = clientRef.current;
      clientRef.current = null;
      if (client) void client.close();
    };
  }, []);

  async function reconnectMcpClient(): Promise<Client> {
    if (reconnectRef.current) return reconnectRef.current;

    const reconnecting = (async () => {
      setConnection('connecting');
      const staleClient = clientRef.current;
      clientRef.current = null;
      if (staleClient) await staleClient.close().catch(() => undefined);

      try {
        const client = await connectMcpClient();
        clientRef.current = client;
        setConnection('connected');
        return client;
      } catch (reason) {
        setConnection('offline');
        throw reason;
      }
    })();

    reconnectRef.current = reconnecting;
    try {
      return await reconnecting;
    } finally {
      if (reconnectRef.current === reconnecting) reconnectRef.current = null;
    }
  }

  async function callTool(name: string, args: Record<string, unknown>) {
    const client = clientRef.current;
    if (!client) throw new Error('MCP server is not connected');
    setRunning(name);
    setError('');
    try {
      let output: unknown;
      try {
        output = toolOutput(await client.callTool({ name, arguments: args }));
      } catch (reason) {
        if (!(reason instanceof StreamableHTTPError) || reason.code !== 400) throw reason;
        const renewedClient = await reconnectMcpClient();
        output = toolOutput(await renewedClient.callTool({ name, arguments: args }));
      }
      setResult(output);
      return output;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      throw reason;
    } finally {
      setRunning('');
    }
  }

  async function runDemo() {
    try {
      await callTool('load_quick_tds_demo', { workspaceId });
      for (const [name] of workflow.slice(0, 4)) await callTool(name, { workspaceId });
    } catch {
      // callTool displays the protocol or validation error.
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const csvEntries = await Promise.all(files.map(async ([key]) => {
        const file = selectedFiles[key];
        if (!file) throw new Error(`Select ${key} before importing`);
        return [key, await file.text()];
      }));
      await callTool('upload_company_data', {
        workspaceId,
        company,
        ...Object.fromEntries(csvEntries)
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  return (
    <main className="landing">
      <nav className="topbar">
        <div className="wordmark"><span>QT</span> Quick TDS</div>
        <div className="nav-links"><a href="#intake">Data intake</a><a href="#workflow">Workflow</a></div>
        <div className={`connection ${connection}`}>{connection}</div>
      </nav>
      <section className="hero">
        <p className="eyebrow">TDS Credit Rescue Rail</p>
        <h1>Every missing credit,<br /><em>traced to its source.</em></h1>
        <p className="lede">Connect commercial records to Form 26AS, isolate the exact difference, and keep the recovery case open until the corrected credit appears.</p>
        <div className="command-card">
          <span className="prompt">›</span>
          <code>MCP endpoint · {typeof window === 'undefined' ? 'localhost:3100/mcp' : `${window.location.hostname}:3100/mcp`}</code>
          <button type="button" onClick={runDemo} disabled={connection !== 'connected' || Boolean(running)}>
            {running ? 'Running workflow…' : 'Run complete demo'}
          </button>
        </div>
      </section>

      <section className="intake" id="intake">
        <div className="section-heading">
          <p className="eyebrow">Structured data intake</p>
          <h2>Import the records the engine can verify.</h2>
          <p>Files are read in your browser and sent as arguments to the MCP tool <code>upload_company_data</code>.</p>
        </div>
        <form className="upload-form" onSubmit={upload}>
          <div className="company-fields">
            <label>Workspace ID<input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} required minLength={2} /></label>
            <label>Company name<input value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} required /></label>
            <label>PAN<input value={company.pan} onChange={(event) => setCompany({ ...company, pan: event.target.value.toUpperCase() })} required pattern="[A-Z]{5}[0-9]{4}[A-Z]" /></label>
            <label>Financial year<input value={company.financialYear} onChange={(event) => setCompany({ ...company, financialYear: event.target.value })} required pattern="[0-9]{4}-[0-9]{2}" /></label>
          </div>
          <div className="file-grid">
            {files.map(([key, label, example]) => (
              <label className="file-field" key={key}>
                <span>{label}</span>
                <small>CSV · template: {example}</small>
                <input type="file" accept=".csv,text/csv" required onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setSelectedFiles((current) => ({ ...current, [key]: file }));
                }} />
              </label>
            ))}
          </div>
          <div className="format-boundary">
            <strong>Current extraction boundary</strong>
            <span className="supported">Form 26AS CSV supported</span>
            <span>AIS import not implemented</span>
            <span>Form 16A and ledger PDFs not parsed; represent evidence in payments.csv</span>
          </div>
          <button className="primary-action" disabled={connection !== 'connected' || Boolean(running)}>
            {running === 'upload_company_data' ? 'Validating through MCP…' : 'Validate and import dataset'}
          </button>
        </form>
      </section>

      <section className="workflow" id="workflow">
        {workflow.map(([tool, title, detail], index) => (
          <article key={tool}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h2>{title}</h2>
            <p>{detail}</p>
            <button type="button" onClick={() => void callTool(tool, { workspaceId }).catch(() => undefined)} disabled={connection !== 'connected' || Boolean(running)}>
              Run tool
            </button>
          </article>
        ))}
      </section>

      <section className="result-panel" aria-live="polite">
        <div><p className="eyebrow">Live MCP result</p><h2>{error ? 'Tool call failed' : result ? 'Tool call completed' : 'Ready for a tool call'}</h2></div>
        <pre className={error ? 'error-output' : ''}>{error || (result ? JSON.stringify(result, null, 2) : 'Connect, load the demo, or import a complete CSV dataset.')}</pre>
      </section>

      <section className="principle">
        <div>
          <p className="eyebrow">The reconciliation principle</p>
          <h2>Three amounts. Never one assumption.</h2>
        </div>
        <div className="formula">
          <p><span>A</span> Expected under configured rule</p>
          <p><span>B</span> Documented as withheld</p>
          <p><span>C</span> Visible in Form 26AS</p>
          <strong>Recoverable gap = B − C</strong>
        </div>
      </section>
    </main>
  );
}
