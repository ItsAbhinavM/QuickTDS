'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { EmptyState, Shell } from '../ui';
const mockUploadSummary = {
  workspaceId: "quick-motors-demo",
  company: {
    name: "Quick Motors Private Limited",
    pan: "AAAAA1234A",
    financialYear: "2025-26"
  },
  imported: {
    counterparties: 4,
    bankAccounts: 3,
    invoices: 12,
    payments: 15,
    form26asRows: 8
  },
  nextStep: "Run link_transactions tool to match payments to invoices and bank transactions."
};

interface UploadOutput {
  workspaceId: string;
  company: { name: string; pan: string; financialYear: string };
  imported: Record<string, number>;
  nextStep: string;
}

const filesSchema = [
  { key: 'counterparties', label: 'Counterparties', example: 'counterparties.csv' },
  { key: 'bankAccounts', label: 'Bank accounts', example: 'bank-accounts.csv' },
  { key: 'invoices', label: 'Invoice ledger', example: 'invoices.csv' },
  { key: 'payments', label: 'Payments & Form 16A', example: 'payments.csv' },
  { key: 'allocations', label: 'Payment allocations', example: 'payment-allocations.csv' },
  { key: 'bankTransactions', label: 'Bank transactions', example: 'bank-transactions.csv' },
  { key: 'form26as', label: 'Form 26AS', example: 'form26as.csv' }
] as const;

export default function UploadSummary() {
  const sdk = useWidgetSDK();
  const sdkData = sdk.getToolOutput<UploadOutput>();
  
  // State for using mock data preview
  const [showMock, setShowMock] = useState(false);
  
  // Form states
  const [workspaceId, setWorkspaceId] = useState('quick-motors-demo');
  const [companyName, setCompanyName] = useState('Quick Motors Private Limited');
  const [pan, setPan] = useState('AAAAA1234A');
  const [financialYear, setFinancialYear] = useState('2025-26');
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const errorToShow = error || (typeof sdkData === 'string' ? sdkData : '');
  const data = (typeof sdkData === 'object' && sdkData) || (showMock ? mockUploadSummary : null);

  const handleFileChange = (key: string, file: File | undefined) => {
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, [key]: file }));
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(false);
    setError('');

    // Validate that all 7 files are selected
    const missingFiles = filesSchema.filter((f) => !selectedFiles[f.key]);
    if (missingFiles.length > 0) {
      setError(`Please select all files. Missing: ${missingFiles.map((f) => f.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Read all files in parallel
      const fileContents = await Promise.all(
        filesSchema.map(async (f) => {
          const content = await readFileAsText(selectedFiles[f.key]);
          return [f.key + 'Csv', content];
        })
      );

      const payload = {
        workspaceId,
        company: {
          name: companyName,
          pan,
          financialYear
        },
        ...Object.fromEntries(fileContents)
      };

      const response = (await sdk.callTool('upload_company_data', payload)) as any;
      
      if (response.isError) {
        const errMsg = typeof response.content?.[0] === 'object' && response.content[0]?.text
          ? response.content[0].text
          : 'Tool execution failed';
        throw new Error(errMsg);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. If we have imported data (from live tool output or mock preview)
  if (data) {
    return (
      <Shell eyebrow="Import register" title="Dataset accepted">
        {showMock && (
          <div className="next-step" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.25)', marginBottom: 20 }}>
            <span>Preview Mode</span>
            <p>Showing mock demo dataset. <button style={{ marginLeft: 16, background: 'var(--saffron)', color: 'white', padding: '4px 8px', border: 0, borderRadius: 4, cursor: 'pointer' }} onClick={() => setShowMock(false)}>Back to Uploader</button></p>
          </div>
        )}
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

  // 2. Otherwise, render the visual File Upload uploader
  return (
    <Shell eyebrow="Structured Intake" title="Upload company dataset">
      <div className="next-step" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
        <span>Uploader</span>
        <p>No active dataset loaded. Upload files or <button type="button" style={{ background: 'var(--accent)', color: 'white', padding: '4px 8px', border: 0, borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowMock(true)}>Load mock preview data</button></p>
      </div>

      <form className="upload-form" onSubmit={handleUpload}>
        {errorToShow && (
          <div className="notice" style={{ borderLeft: '4px solid var(--red)', background: 'rgba(244, 63, 94, 0.05)', color: 'var(--red)', padding: 12 }}>
            <strong>Upload Error</strong>
            <p style={{ margin: 0, fontSize: 13, textTransform: 'none' }}>{errorToShow}</p>
          </div>
        )}

        <div className="company-fields">
          <label>
            Workspace ID
            <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} required minLength={2} />
          </label>
          <label>
            Company name
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </label>
          <label>
            PAN
            <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} required pattern="[A-Z]{5}[0-9]{4}[A-Z]" />
          </label>
          <label>
            Financial year
            <input value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} required pattern="[0-9]{4}-[0-9]{2}" />
          </label>
        </div>

        <div className="file-grid">
          {filesSchema.map(({ key, label, example }) => (
            <label className="file-field" key={key}>
              <span>{label}</span>
              <small>CSV template: {example}</small>
              <input 
                type="file" 
                accept=".csv,text/csv" 
                required 
                onChange={(e) => handleFileChange(key, e.target.files?.[0])} 
              />
            </label>
          ))}
        </div>

        <div className="format-boundary">
          <strong>File formatting requirements</strong>
          <span className="supported">All 7 files must be selected</span>
          <span>Form 26AS matching gross/tds amounts</span>
        </div>

        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Importing and validating...' : 'Validate and import dataset'}
        </button>
      </form>
    </Shell>
  );
}
