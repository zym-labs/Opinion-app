'use client';

// AD-05 Communities (incl. campus email domains) and categories.
import { useState } from 'react';

import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: 'topic' | 'campus';
  archived: boolean;
  domains: string[];
  members: number;
};

const EMPTY = { slug: '', name: '', description: '', kind: 'topic' as const, archived: false, domains: '' };

export default function Communities() {
  const { data, error, reload } = useRpc<Community[]>('admin_list_communities');
  const launch = useRpc<{ community_id: string; members: number; launch_target: number }[]>('community_progress');
  const targets = new Map((launch.data ?? []).map((l) => [l.community_id, l.launch_target]));

  async function setTarget(c: Community) {
    const raw = prompt('Members needed before public polls open (empty = open now)', String(targets.get(c.id) ?? ''));
    if (raw === null) return;
    const n = raw.trim() ? Number(raw) : null;
    if (n !== null && !(Number.isInteger(n) && n > 0)) return alert('Enter a whole number, or leave empty.');
    try {
      await rpc('admin_set_launch_target', { p_community: c.id, p_target: n });
      await launch.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }
  const [form, setForm] = useState<{ slug: string; name: string; description: string; kind: 'topic' | 'campus'; archived: boolean; domains: string }>(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    try {
      await rpc('admin_upsert_community', {
        p_slug: form.slug.trim(),
        p_name: form.name.trim(),
        p_description: form.description.trim(),
        p_kind: form.kind,
        p_archived: form.archived,
        p_domains: form.domains.split(',').map((d) => d.trim()).filter(Boolean),
      });
      setForm(EMPTY);
      setMsg('Saved.');
      reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className="stack" style={{ gap: 32 }}>
      <section className="stack">
        <h1 style={{ margin: 0 }}>Communities</h1>
        {error && <p className="error">{error}</p>}
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Members</th>
              <th>Domains</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.name} {c.archived && <span className="badge">archived</span>}
                  <br />
                  <span className="faint">{c.slug}</span>
                </td>
                <td>{c.kind}</td>
                <td>
                  {c.members}
                  {targets.has(c.id) ? ` / ${targets.get(c.id)} to open` : ''}
                </td>
                <td>{c.domains.join(', ')}</td>
                <td>
                  <button
                    onClick={() =>
                      setForm({ slug: c.slug, name: c.name, description: c.description, kind: c.kind, archived: c.archived, domains: c.domains.join(', ') })
                    }>
                    Edit
                  </button>{' '}
                  {c.kind === 'campus' && <button onClick={() => setTarget(c)}>Launch target</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form className="card stack" style={{ maxWidth: 560 }} onSubmit={(e) => (e.preventDefault(), save())}>
        <h2 style={{ margin: 0 }}>{data?.some((c) => c.slug === form.slug) ? 'Edit community' : 'New community'}</h2>
        <label className="stack">
          Slug
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} pattern="[a-z0-9-]+" required />
        </label>
        <label className="stack">
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="stack">
          Description
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="stack">
          Kind
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'topic' | 'campus' })}>
            <option value="topic">Topic</option>
            <option value="campus">Campus (email verification)</option>
          </select>
        </label>
        {form.kind === 'campus' && (
          <label className="stack">
            Email domains (comma-separated)
            <input value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder="uni.edu, student.uni.edu" />
          </label>
        )}
        <label className="row">
          <input type="checkbox" checked={form.archived} onChange={(e) => setForm({ ...form, archived: e.target.checked })} style={{ minHeight: 0 }} />
          Archived (hidden from users)
        </label>
        <div className="row">
          <button className="primary">Save</button>
          <button type="button" onClick={() => setForm(EMPTY)}>
            Clear
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </form>

      <Categories />
    </div>
  );
}

function Categories() {
  const [cats, setCats] = useState<{ slug: string; name: string; is_sensitive: boolean; archived: boolean; sort: number }[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    // Includes archived categories so they can be restored.
    setCats(await rpc('admin_list_categories'));
  }

  async function save(c: { slug: string; name: string; is_sensitive: boolean; archived: boolean; sort: number }) {
    try {
      await rpc('admin_upsert_category', { p_slug: c.slug, p_name: c.name, p_sensitive: c.is_sensitive, p_archived: c.archived, p_sort: c.sort });
      setMsg(`Saved ${c.name}.`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <section className="stack">
      <h2 style={{ margin: 0 }}>Categories</h2>
      {!cats ? (
        <button onClick={load} style={{ alignSelf: 'flex-start' }}>
          Load categories
        </button>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Sensitive (adds “not professional advice”)</th>
              <th>Archived</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.slug}>
                <td>{c.name}</td>
                <td>
                  <input type="checkbox" checked={c.is_sensitive} onChange={(e) => save({ ...c, is_sensitive: e.target.checked })} style={{ minHeight: 0 }} aria-label={`${c.name} sensitive`} />
                </td>
                <td>
                  <input type="checkbox" checked={c.archived} onChange={(e) => save({ ...c, archived: e.target.checked })} style={{ minHeight: 0 }} aria-label={`${c.name} archived`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {msg && <p className="muted">{msg}</p>}
    </section>
  );
}
