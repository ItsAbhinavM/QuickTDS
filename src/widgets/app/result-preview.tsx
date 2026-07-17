import type { ReactNode } from 'react';
import { formatLabel, formatMoney, StatusPill } from './ui';

interface Company {
  name: string;
  pan: string;
  financialYear: string;
}

interface Expectation {
  invoiceId: string;
  counterpartyName: string;
  tan: string;
  quarter: string;
  section: string;
  expectedPaise: number;
  actualWithheldPaise: number;
  evidence: string;
}

interface Decision extends Expectation {
  id: string;
  status: string;
  observedPaise: number;
  creditGapPaise: number;
  deductionGapPaise: number;
}

interface RecoveryCase {
  id: string;
  invoiceId: string;
  counterpartyName: string;
  tan: string;
  issue: string;
  amountPaise: number;
  status: string;
}

interface Summary {
  expectedPaise: number;
  actualWithheldPaise: number;
  observedPaise: number;
  recoverableGapPaise: number;
}

interface UploadOutput {
  workspaceId: string;
  company: Company;
  imported: Record<string, number>;
  nextStep: string;
}

interface LinkOutput {
  workspaceId: string;
  invoicePaymentLinks: number;
  bankLinks: Array<{ paymentId: string; bankTransactionId?: string; status: string }>;
  counts: { exact: number; proposed: number; unmatched: number };
  nextStep: string;
}

interface CalculationOutput {
  workspaceId: string;
  expectations: Expectation[];
  totals: { expectedPaise: number; actualWithheldPaise: number };
  disclaimer: string;
  nextStep: string;
}

interface ReconciliationOutput {
  workspaceId: string;
  company: Company;
  summary: Summary;
  decisions: Decision[];
  nextStep: string;
}

interface CasesOutput {
  workspaceId: string;
  cases: RecoveryCase[];
}

interface WorkspaceOutput {
  workspaceId: string;
  company: Company;
  summary: Summary | null;
  decisions: Decision[];
  cases: RecoveryCase[];
  snapshots: Array<{ id: string; kind: string; importedAt: string }>;
}

function maskPan(pan: string): string {
  return `${pan.slice(0, 3)}****${pan.slice(-2)}`;
}

function StatCards({ items }: { items: Array<{ label: string; value: ReactNode; risk?: boolean }> }) {
  return (
    <div className="preview-stats">
      {items.map((item) => (
        <article className={item.risk ? 'risk' : ''} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function PreviewSection({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="preview-section">
      <header><h3>{title}</h3>{count !== undefined && <span>{count} records</span>}</header>
      {children}
    </section>
  );
}

function EmptyRows() {
  return <p className="preview-empty">No records to display.</p>;
}

function NextStep({ children }: { children: ReactNode }) {
  return <div className="preview-next"><strong>Next</strong><span>{children}</span></div>;
}

function DecisionTable({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) return <EmptyRows />;
  return (
    <div className="preview-table-wrap">
      <table className="preview-table preview-table-decisions">
        <thead><tr><th>Reference</th><th>Deductor</th><th className="number">Expected</th><th className="number">Withheld</th><th className="number">26AS</th><th className="number">Difference</th><th className="status-cell">Status</th></tr></thead>
        <tbody>{decisions.map((item) => (
          <tr key={item.id}>
            <td><strong>{item.invoiceId}</strong><small>{item.quarter} / {item.section}</small></td>
            <td>{item.counterpartyName}<small>{item.tan}</small></td>
            <td className="number">{formatMoney(item.expectedPaise)}</td>
            <td className="number">{formatMoney(item.actualWithheldPaise)}</td>
            <td className="number">{formatMoney(item.observedPaise)}</td>
            <td className="number difference">{formatMoney(Math.max(item.creditGapPaise, item.deductionGapPaise))}</td>
            <td className="status-cell"><StatusPill status={item.status} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function CasesTable({ cases }: { cases: RecoveryCase[] }) {
  if (cases.length === 0) return <EmptyRows />;
  return (
    <div className="preview-table-wrap">
      <table className="preview-table preview-table-cases">
        <thead><tr><th>Reference</th><th>Deductor</th><th className="label-cell">Issue</th><th className="number">Amount</th><th className="status-cell">Case status</th></tr></thead>
        <tbody>{cases.map((item) => (
          <tr key={item.id}>
            <td><strong>{item.invoiceId}</strong><small>{item.id}</small></td>
            <td>{item.counterpartyName}<small>{item.tan}</small></td>
            <td className="label-cell">{formatLabel(item.issue)}</td>
            <td className="number">{formatMoney(item.amountPaise)}</td>
            <td className="status-cell"><StatusPill status={item.status} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function SummaryCards({ summary }: { summary: Summary }) {
  return <StatCards items={[
    { label: 'Expected TDS', value: formatMoney(summary.expectedPaise) },
    { label: 'Documented withheld', value: formatMoney(summary.actualWithheldPaise) },
    { label: 'Visible in 26AS', value: formatMoney(summary.observedPaise) },
    { label: 'Credit at risk', value: formatMoney(summary.recoverableGapPaise), risk: true }
  ]} />;
}

function UploadPreview({ data }: { data: UploadOutput }) {
  return (
    <div className="preview-grid">
      <div className="preview-notice"><strong>{data.company.name}</strong><span>{data.company.financialYear} / PAN {maskPan(data.company.pan)}</span></div>
      <StatCards items={Object.entries(data.imported).map(([label, count]) => ({ label: formatLabel(label), value: count }))} />
      <p className="preview-workspace">Workspace: <code>{data.workspaceId}</code></p>
      <NextStep>{data.nextStep}</NextStep>
    </div>
  );
}

function LinkPreview({ data }: { data: LinkOutput }) {
  return (
    <div className="preview-grid">
      <StatCards items={[
        { label: 'Invoice allocations', value: data.invoicePaymentLinks },
        { label: 'Exact bank links', value: data.counts.exact },
        { label: 'Proposed links', value: data.counts.proposed },
        { label: 'Unmatched', value: data.counts.unmatched, risk: data.counts.unmatched > 0 }
      ]} />
      <PreviewSection title="Bank links" count={data.bankLinks.length}>
        {data.bankLinks.length === 0 ? <EmptyRows /> : <div className="preview-table-wrap">
          <table className="preview-table preview-table-links">
            <thead><tr><th>Payment</th><th>Bank transaction</th><th className="status-cell">Status</th></tr></thead>
            <tbody>{data.bankLinks.map((item) => <tr key={item.paymentId}><td>{item.paymentId}</td><td>{item.bankTransactionId || 'Not linked'}</td><td className="status-cell"><StatusPill status={item.status} /></td></tr>)}</tbody>
          </table>
        </div>}
      </PreviewSection>
      <NextStep>{data.nextStep}</NextStep>
    </div>
  );
}

function CalculationPreview({ data }: { data: CalculationOutput }) {
  return (
    <div className="preview-grid">
      <StatCards items={[
        { label: 'Expected TDS', value: formatMoney(data.totals.expectedPaise) },
        { label: 'Documented withheld', value: formatMoney(data.totals.actualWithheldPaise) }
      ]} />
      <PreviewSection title="TDS expectations" count={data.expectations.length}>
        {data.expectations.length === 0 ? <EmptyRows /> : <div className="preview-table-wrap">
          <table className="preview-table preview-table-expectations">
            <thead><tr><th>Reference</th><th>Deductor</th><th>Period</th><th className="number">Expected</th><th className="number">Withheld</th><th className="label-cell">Evidence</th></tr></thead>
            <tbody>{data.expectations.map((item) => (
              <tr key={item.invoiceId}>
                <td><strong>{item.invoiceId}</strong><small>{item.section}</small></td>
                <td>{item.counterpartyName}<small>{item.tan}</small></td>
                <td>{item.quarter}</td>
                <td className="number">{formatMoney(item.expectedPaise)}</td>
                <td className="number">{formatMoney(item.actualWithheldPaise)}</td>
                <td className="label-cell">{formatLabel(item.evidence)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </PreviewSection>
      <p className="preview-disclaimer">{data.disclaimer}</p>
      <NextStep>{data.nextStep}</NextStep>
    </div>
  );
}

function ReconciliationPreview({ data }: { data: ReconciliationOutput }) {
  return (
    <div className="preview-grid">
      <div className="preview-notice"><strong>{data.company.name}</strong><span>{data.company.financialYear}</span></div>
      <SummaryCards summary={data.summary} />
      <PreviewSection title="Reconciliation decisions" count={data.decisions.length}><DecisionTable decisions={data.decisions} /></PreviewSection>
      <NextStep>{data.nextStep}</NextStep>
    </div>
  );
}

function RecoveryPreview({ data }: { data: CasesOutput }) {
  return (
    <div className="preview-grid">
      <StatCards items={[{ label: 'Recovery cases', value: data.cases.length, risk: data.cases.length > 0 }]} />
      <PreviewSection title="Recovery register" count={data.cases.length}><CasesTable cases={data.cases} /></PreviewSection>
      <p className="preview-workspace">Workspace: <code>{data.workspaceId}</code></p>
    </div>
  );
}

function WorkspacePreview({ data }: { data: WorkspaceOutput }) {
  return (
    <div className="preview-grid">
      <div className="preview-notice"><strong>{data.company.name}</strong><span>{data.company.financialYear} / Workspace {data.workspaceId}</span></div>
      {data.summary ? <SummaryCards summary={data.summary} /> : <p className="preview-empty">Run reconciliation to generate a workspace summary.</p>}
      <PreviewSection title="Decisions" count={data.decisions.length}><DecisionTable decisions={data.decisions} /></PreviewSection>
      <PreviewSection title="Recovery cases" count={data.cases.length}><CasesTable cases={data.cases} /></PreviewSection>
      <PreviewSection title="Form 26AS snapshots" count={data.snapshots.length}>
        {data.snapshots.length === 0 ? <EmptyRows /> : <div className="preview-table-wrap">
          <table className="preview-table preview-table-snapshots">
            <thead><tr><th>Snapshot</th><th>Kind</th><th>Imported</th></tr></thead>
            <tbody>{data.snapshots.map((item) => <tr key={item.id}><td>{item.id}</td><td>{formatLabel(item.kind)}</td><td>{item.importedAt}</td></tr>)}</tbody>
          </table>
        </div>}
      </PreviewSection>
    </div>
  );
}

export function ToolResultGrid({ toolName, result }: { toolName: string; result: unknown }) {
  switch (toolName) {
    case 'load_quick_tds_demo':
    case 'upload_company_data':
      return <UploadPreview data={result as UploadOutput} />;
    case 'link_transactions':
      return <LinkPreview data={result as LinkOutput} />;
    case 'calculate_expected_tds':
      return <CalculationPreview data={result as CalculationOutput} />;
    case 'run_26as_reconciliation':
      return <ReconciliationPreview data={result as ReconciliationOutput} />;
    case 'create_recovery_cases':
      return <RecoveryPreview data={result as CasesOutput} />;
    case 'get_tds_workspace':
      return <WorkspacePreview data={result as WorkspaceOutput} />;
    default:
      return <p className="preview-empty">A grid preview is not available for this tool. Switch to JSON to inspect the result.</p>;
  }
}
