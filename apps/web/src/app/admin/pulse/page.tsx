'use client';

// AD-12 Campus Pulse: sponsored questions for clubs, student unions and brands. Shown only to people who
// opted in, always labelled with the sponsor. Sponsors get the same aggregate result any asker gets.
import { useState } from 'react';

import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = {
  poll_id: string;
  sponsor: string;
  question: string;
  status: string;
  vote_count: number;
  closes_at: string;
  result: { state: string; options: { side: string; label: string | null; pct: number | null }[]; summary: { majority: string | null } | null } | null;
};
type Community = { id: string; name: string };
type Category = { id: number; name: string };

export default function Pulse() {
  const { data, error, reload } = useRpc<Row[]>('admin_sponsored_polls');
  const communities = useRpc<Community[]>('admin_list_communities');
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [form, setForm] = useState({ sponsor: '', question: '', options: ['', ''], hours: 24, target: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function loadCategories() {
    if (categories) return;
    const { supabase } = await import('@/lib/supabase');
    const { data: rows } = await supabase.from('categories').select('id, name').eq('archived', false).order('sort');
    setCategories((rows as Category[]) ?? []);
  }

  async function create() {
    setMsg(null);
    const [kind, id] = form.target.split(':');
    try {
      await rpc('admin_create_sponsored_poll', {
        p_sponsor: form.sponsor.trim(),
        p_question: form.question.trim(),
        p_labels: form.options.map((o) => o.trim()).filter(Boolean),
        p_hours: form.hours,
        p_community: kind === 'community' ? id : null,
        p_category: kind === 'category' ? Number(id) : null,
      });
      setForm({ sponsor: '', question: '', options: ['', ''], hours: 24, target: '' });
      setMsg('Published to people who opted in.');
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Campus Pulse</h1>
      <p className="muted">
        Sponsored questions go live immediately to opted-in members of one community or topic. Keep them neutral,
        no personal data requests, no hidden marketing. Share only the aggregate result with the sponsor.
      </p>
      {error && <p className="error">{error}</p>}
      <form className="card stack" style={{ maxWidth: 560 }} onFocus={loadCategories} onSubmit={(e) => (e.preventDefault(), create())}>
        <label className="stack">
          Sponsor (shown to voters)
          <input value={form.sponsor} maxLength={60} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} />
        </label>
        <label className="stack">
          Question
          <input value={form.question} maxLength={120} onChange={(e) => setForm({ ...form, question: e.target.value })} />
        </label>
        {form.options.map((o, i) => (
          <label key={i} className="stack">
            Option {String.fromCharCode(65 + i)}
            <input
              value={o}
              maxLength={60}
              onChange={(e) => setForm({ ...form, options: form.options.map((x, j) => (j === i ? e.target.value : x)) })}
            />
          </label>
        ))}
        {form.options.length < 4 && (
          <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ''] })}>
            Add option
          </button>
        )}
        <label className="stack">
          Audience
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
            <option value="">Choose…</option>
            <optgroup label="Communities">
              {communities.data?.map((c) => (
                <option key={c.id} value={`community:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Topics">
              {categories?.map((c) => (
                <option key={c.id} value={`category:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="stack">
          Hours open
          <input type="number" min={3} max={48} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
        </label>
        <button
          className="primary"
          disabled={!form.sponsor.trim() || form.question.trim().length < 5 || !form.target || form.options.filter((o) => o.trim()).length < 2}>
          Publish
        </button>
        {msg && <p className="muted">{msg}</p>}
      </form>
      {data && data.length > 0 && (
        <table className="data">
          <thead>
            <tr>
              <th>Sponsor</th>
              <th>Question</th>
              <th>Votes</th>
              <th>Result (share this)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.poll_id}>
                <td>{r.sponsor}</td>
                <td>
                  {r.question}
                  <div className="faint">{r.status === 'active' ? `closes ${new Date(r.closes_at).toLocaleString()}` : r.status}</div>
                </td>
                <td>{r.vote_count}</td>
                <td>
                  {r.result && r.result.state !== 'not_enough_responses'
                    ? r.result.options.map((o) => `${o.label ?? o.side.toUpperCase()} ${Number(o.pct ?? 0).toFixed(0)}%`).join(' · ')
                    : r.status === 'active'
                      ? 'Open'
                      : 'Not enough votes'}
                  {r.result?.summary?.majority && <div className="faint">{r.result.summary.majority}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
