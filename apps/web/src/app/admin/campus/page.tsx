'use client';

// AD-13 Campus partners: set a campus's own support line (shown first on the crisis card for its students)
// and produce the totals-only report a university partner receives. Small numbers are suppressed.
import { useState } from 'react';

import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Community = { id: string; name: string; kind: 'topic' | 'campus' };
type Report = Record<string, string | number | boolean | null>;

export default function CampusPartners() {
  const { data, error } = useRpc<Community[]>('admin_list_communities');
  const campuses = (data ?? []).filter((c) => c.kind === 'campus');
  const [id, setId] = useState('');
  const [support, setSupport] = useState({ name: '', phone: '', url: '' });
  const [report, setReport] = useState<Report | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, done?: string) {
    setMsg(null);
    try {
      await fn();
      if (done) setMsg(done);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Campus partners</h1>
      <p className="muted">
        Offer each university a support line on the crisis card and a monthly, totals-only report. No individual data is
        ever shared; counts under 5 are hidden.
      </p>
      {error && <p className="error">{error}</p>}
      <select value={id} onChange={(e) => (setId(e.target.value), setReport(null))}>
        <option value="">Choose a campus…</option>
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {id && (
        <>
          <form
            className="card stack"
            style={{ maxWidth: 560 }}
            onSubmit={(e) => (
              e.preventDefault(),
              run(() => rpc('admin_set_community_support', { p_community: id, p_name: support.name, p_phone: support.phone, p_url: support.url || null }), 'Support line saved.')
            )}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Support line</h2>
            <label className="stack">
              Service name
              <input value={support.name} placeholder="Counselling & Wellbeing" onChange={(e) => setSupport({ ...support, name: e.target.value })} />
            </label>
            <label className="stack">
              Phone (24/7 if possible)
              <input value={support.phone} onChange={(e) => setSupport({ ...support, phone: e.target.value })} />
            </label>
            <label className="stack">
              Web page (https)
              <input value={support.url} onChange={(e) => setSupport({ ...support, url: e.target.value })} />
            </label>
            <button className="primary">Save</button>
          </form>
          <div className="row">
            <button onClick={() => run(async () => setReport(await rpc<Report>('admin_campus_report', { p_community: id, p_days: 30 })))}>
              Build 30-day report
            </button>
            {report && (
              <button onClick={() => navigator.clipboard.writeText(Object.entries(report).map(([k, v]) => `${k}: ${v}`).join('\n'))}>
                Copy report
              </button>
            )}
          </div>
          {report && (
            <table className="data">
              <tbody>
                {Object.entries(report).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k.replace(/_/g, ' ')}</th>
                    <td>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
