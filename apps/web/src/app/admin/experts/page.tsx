'use client';

// Verified experts: which email domains prove expertise in a category (e.g. nhs.net for Medicine).
// Subdomains count automatically (ac.uk covers ed.ac.uk).
import { useEffect, useState } from 'react';

import { rpc, supabase } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = { category_id: number; category: string; domain: string; label: string; verified_users: number };

export default function Experts() {
  const { data, error, reload } = useRpc<Row[]>('admin_expert_domains');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({ category: '', domain: '', label: '' });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('categories').select('id, name').order('sort').then(({ data: c }) => setCategories(c ?? []));
  }, []);

  async function save(remove = false, row?: Row) {
    setMsg(null);
    try {
      await rpc('admin_set_expert_domain', {
        p_category: row?.category_id ?? Number(form.category),
        p_domain: row?.domain ?? form.domain,
        p_label: row?.label ?? form.label,
        p_remove: remove,
      });
      if (!remove) setForm({ ...form, domain: '', label: '' });
      reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 style={{ margin: 0 }}>Verified experts</h1>
      <p className="muted">
        Users in a category can verify with an email on these domains. Only a hash of the address is stored. Results
        show a verified-expert split only when at least 5 verified experts voted. Choose domains that only real
        professionals or students can get (not general email providers).
      </p>
      {error && <p className="error">{error}</p>}
      <table className="data">
        <thead>
          <tr>
            <th>Category</th>
            <th>Domain</th>
            <th>Shown as</th>
            <th>Verified users</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.map((r) => (
            <tr key={`${r.category_id}-${r.domain}`}>
              <td>{r.category}</td>
              <td>{r.domain}</td>
              <td>{r.label}</td>
              <td>{r.verified_users}</td>
              <td>
                <button onClick={() => confirm(`Remove ${r.domain}? Existing verifications stay until they expire.`) && save(true, r)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="card stack" style={{ maxWidth: 480 }} onSubmit={(e) => (e.preventDefault(), save())}>
        <h2 style={{ margin: 0 }}>Add a domain</h2>
        <label className="stack">
          Category
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="stack">
          Email domain
          <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="nhs.net" required />
        </label>
        <label className="stack">
          Shown to users as
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="NHS staff" />
        </label>
        <button className="primary">Add</button>
        {msg && <p className="error">{msg}</p>}
      </form>
    </div>
  );
}
