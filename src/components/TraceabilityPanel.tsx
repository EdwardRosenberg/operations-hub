import React, { useState } from 'react';

const featuresById = require('../../content/features-by-id.json') as Record<string, any>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border:'1px solid var(--ifm-color-emphasis-300)', borderRadius:6, marginBottom:'.75rem' }}>
      <button onClick={() => setOpen(!open)} style={{
        width:'100%', textAlign:'left', padding:'.6rem 1rem',
        background:'var(--ifm-color-emphasis-100)', border:'none',
        cursor:'pointer', fontWeight:600, fontSize:'.9rem',
        borderRadius: open ? '6px 6px 0 0' : 6,
      }}>
        {open ? '▾' : '▸'} {title}
      </button>
      {open && <div style={{ padding:'.75rem 1rem' }}>{children}</div>}
    </div>
  );
}

export default function TraceabilityPanel({ serviceId, featureId }: { serviceId: string; featureId: string }) {
  const f = featuresById[`${serviceId}:${featureId}`];
  if (!f) return <p style={{ color:'var(--ifm-color-warning)' }}>⚠️ Feature <code>{featureId}</code> not in manifest.</p>;

  return (
    <div style={{ marginTop:'2rem', marginBottom:'2rem' }}>
      <h3>Traceability</h3>
      <Section title={`Implementation (${f.implementation?.length ?? 0} files)`}>
        {f.implementation?.length
          ? <ul>{f.implementation.map((p: string) => <li key={p}><code>{p}</code></li>)}</ul>
          : <em>No implementation files registered.</em>}
      </Section>
      <Section title={`Tests (${f.test_cases_total} cases · ${f.test_cases_passing} passing)`}>
        {f.tests?.length
          ? f.tests.map((t: any) => (
            <div key={t.class}>
              <strong>{t.class}</strong>
              <ul>{(t.cases ?? []).map((c: string) => <li key={c}><code>{c}</code></li>)}</ul>
            </div>))
          : <em>No test cases registered.</em>}
      </Section>
      <Section title="Observability">
        <div style={{ display:'flex', gap:'1rem' }}>
          {f.observability?.grafana && <a href={f.observability.grafana} target="_blank" rel="noopener">📊 Grafana</a>}
          {f.observability?.kibana  && <a href={f.observability.kibana}  target="_blank" rel="noopener">🔍 Kibana</a>}
          {!f.observability?.grafana && !f.observability?.kibana && <em style={{ color:'var(--ifm-color-emphasis-500)' }}>None configured.</em>}
        </div>
      </Section>
    </div>
  );
}
