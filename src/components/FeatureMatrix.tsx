import React, { useState, useMemo } from 'react';
import TestBadge from './TestBadge';
import styles from './FeatureMatrix.module.css';

type Status = 'passing' | 'failing' | 'not_covered';

interface Feature {
  id: string; title: string; description: string;
  service_id: string; service_label: string; doc_url: string;
  test_status: Status; test_cases_total: number; test_cases_passing: number;
  observability: { grafana?: string | null; kibana?: string | null };
}
interface Props { features: Feature[]; services: { id: string; label: string }[]; }

export default function FeatureMatrix({ features, services }: Props) {
  const [search, setSearch] = useState('');
  const [svc, setSvc]     = useState('all');
  const [status, setStatus] = useState<'all' | Status>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return features.filter((f) =>
      (!q || f.title.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) || f.service_label.toLowerCase().includes(q)) &&
      (svc === 'all' || f.service_id === svc) &&
      (status === 'all' || f.test_status === status)
    );
  }, [features, search, svc, status]);

  return (
    <div>
      <div className={styles.controls}>
        <input className={styles.search} type="search" placeholder="Search features…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.select} value={svc} onChange={(e) => setSvc(e.target.value)}>
          <option value="all">All services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="all">All statuses</option>
          <option value="passing">Passing</option>
          <option value="failing">Failing</option>
          <option value="not_covered">Not covered</option>
        </select>
        <span className={styles.count}>{filtered.length} feature{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Feature</th><th>Service</th><th>Status</th><th>Coverage</th><th>Observability</th></tr></thead>
        <tbody>
          {filtered.length === 0 && <tr><td colSpan={5} className={styles.empty}>No features match.</td></tr>}
          {filtered.map((f) => (
            <tr key={`${f.service_id}:${f.id}`} className={styles.row}>
              <td>
                <a href={f.doc_url} className={styles.title}>{f.title}</a>
                {f.description && <div className={styles.desc}>{f.description}</div>}
              </td>
              <td><span className={styles.tag}>{f.service_label}</span></td>
              <td><TestBadge status={f.test_status} /></td>
              <td className={styles.cov}>{f.test_cases_total > 0 ? `${f.test_cases_passing}/${f.test_cases_total}` : '—'}</td>
              <td className={styles.obs}>
                {f.observability.grafana && <a href={f.observability.grafana} target="_blank" rel="noopener" title="Grafana">📊</a>}
                {f.observability.kibana  && <a href={f.observability.kibana}  target="_blank" rel="noopener" title="Kibana">🔍</a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
