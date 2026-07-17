const steps = [
  ['01', 'Upload', 'Company, customer, invoice, payment, bank and Form 26AS records.'],
  ['02', 'Connect', 'Trace split payments from invoice to receipt across every account.'],
  ['03', 'Calculate', 'Apply the reviewed TDS base, section and rate supplied in the dataset.'],
  ['04', 'Reconcile', 'Compare documented withholding with government-recorded credit.'],
  ['05', 'Recover', 'Open cases, record correction references and verify a refreshed statement.']
];

export default function Home() {
  return (
    <main className="landing">
      <nav className="topbar">
        <div className="wordmark"><span>QT</span> Quick TDS</div>
        <div className="edition">MVP · FY 2025-26</div>
      </nav>
      <section className="hero">
        <p className="eyebrow">TDS Credit Rescue Rail</p>
        <h1>Every missing credit,<br /><em>traced to its source.</em></h1>
        <p className="lede">Connect commercial records to Form 26AS, isolate the exact difference, and keep the recovery case open until the corrected credit appears.</p>
        <div className="command-card">
          <span className="prompt">›</span>
          <code>Load the Quick TDS demo and reconcile workspace quick-motors-demo</code>
        </div>
      </section>
      <section className="workflow">
        {steps.map(([number, title, detail]) => (
          <article key={number}>
            <span>{number}</span>
            <h2>{title}</h2>
            <p>{detail}</p>
          </article>
        ))}
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
