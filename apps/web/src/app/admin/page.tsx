'use client';

// AD-02 Moderation queue: grouped by reported item, most severe and oldest first.
import Link from 'next/link';
import { useState } from 'react';

import { useRpc } from './use-rpc';

type Row = {
  report_id: string;
  target_type: string;
  reason: string;
  severity: number;
  created_at: string;
  report_count: number;
  preview: string | null;
};

const SLA_HOURS = 24;

function age(iso: string, now: number) {
  const h = (now - new Date(iso).getTime()) / 3_600_000;
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
}

export default function Queue() {
  const [status, setStatus] = useState<'open' | 'actioned' | 'dismissed'>('open');
  const [now] = useState(() => Date.now());
  const { data, error, loading } = useRpc<Row[]>('admin_queue', { p_status: status });
  const rows = [...(data ?? [])].sort((a, b) => b.severity - a.severity || a.created_at.localeCompare(b.created_at));

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>Moderation queue</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="open">Open</option>
          <option value="actioned">Actioned</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Nothing here.</p>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Item</th>
              <th>Reason</th>
              <th>Reports</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overdue = status === 'open' && now - new Date(r.created_at).getTime() > SLA_HOURS * 3_600_000;
              return (
                <tr key={r.report_id}>
                  <td>
                    <span className={`badge ${r.severity >= 3 ? 'high' : ''}`}>{['', 'Low', 'Medium', 'High'][r.severity]}</span>
                  </td>
                  <td>
                    <Link href={`/admin/report/${r.report_id}`}>
                      <span className="faint">{r.target_type.replace('_', ' ')}</span>
                      <br />
                      {r.preview ?? '(deleted)'}
                    </Link>
                  </td>
                  <td>{r.reason.replace('_', ' ')}</td>
                  <td>{r.report_count}</td>
                  <td className={overdue ? 'error' : ''}>
                    {age(r.created_at, now)}
                    {overdue ? ' · over SLA' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
