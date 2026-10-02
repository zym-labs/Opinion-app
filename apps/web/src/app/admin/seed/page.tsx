'use client';

// Seed polls for launch communities (STAGE7 Phase 8, docs/phase0/SEED_POLLS.md).
import { useEffect, useState } from 'react';

import { rpc, supabase } from '@/lib/supabase';

type Option = { id: string | number; name: string };

export default function Seed() {
  const [categories, setCategories] = useState<Option[]>([]);
  const [communities, setCommunities] = useState<Option[]>([]);
  const [form, setForm] = useState({
    type: 'expert' as 'expert' | 'community',
    question: '',
    a: '',
    b: '',
    category: '',
    community: '',
    hours: 24,
    taste: false,
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('categories').select('id, name').order('sort').then(({ data }) => setCategories(data ?? []));
    supabase.from('communities').select('id, name').order('name').then(({ data }) => setCommunities(data ?? []));
  }, []);

  async function post() {
    setMsg(null);
    try {
      await rpc('admin_seed_poll', {
        p_type: form.type,
        p_question: form.question.trim(),
        p_label_a: form.a.trim(),
        p_label_b: form.b.trim(),
        p_categories: form.type === 'expert' ? [Number(form.category)] : [],
        p_community: form.type === 'community' ? form.community : null,
        p_hours: form.hours,
        p_is_taste: form.taste,
      });
      setMsg('Posted.');
      setForm({ ...form, question: '', a: '', b: '' });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <form className="card stack" style={{ maxWidth: 560 }} onSubmit={(e) => (e.preventDefault(), post())}>
      <h1 style={{ margin: 0 }}>Seed a poll</h1>
      <p className="muted">Posted from your admin account, skipping credits and the audience minimum. Use for launch only.</p>
      <label className="stack">
        Type
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'expert' | 'community' })}>
          <option value="expert">Expert (category)</option>
          <option value="community">Community</option>
        </select>
      </label>
      {form.type === 'expert' ? (
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
      ) : (
        <label className="stack">
          Community
          <select value={form.community} onChange={(e) => setForm({ ...form, community: e.target.value })} required>
            <option value="">Choose…</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="stack">
        Question
        <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} minLength={5} maxLength={120} required />
      </label>
      <div className="row">
        <label className="stack" style={{ flex: 1 }}>
          Option A
          <input value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} maxLength={60} required />
        </label>
        <label className="stack" style={{ flex: 1 }}>
          Option B
          <input value={form.b} onChange={(e) => setForm({ ...form, b: e.target.value })} maxLength={60} required />
        </label>
      </div>
      <label className="stack">
        Duration (hours)
        <input type="number" min={3} max={24} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
      </label>
      <label className="row">
        <input type="checkbox" checked={form.taste} onChange={(e) => setForm({ ...form, taste: e.target.checked })} style={{ minHeight: 0 }} />
        Taste question (reasons optional)
      </label>
      <button className="primary">Post seed poll</button>
      {msg && <p className="muted">{msg}</p>}
    </form>
  );
}
