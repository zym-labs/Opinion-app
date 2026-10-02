'use client';

// AD-04 User lookup by internal handle or email.
import { useState } from 'react';

import { rpc } from '@/lib/supabase';

type User = {
  id: string;
  handle: string;
  status: string;
  created_at: string;
  onboarding_step: string;
  polls: number;
  votes: number;
  actions: { action: string; rule: string | null; at: string }[];
};

export default function Users() {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setError(null);
    try {
      setUser(await rpc<User | null>('admin_user', { p_query: query.trim() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  async function setStatus(status: 'active' | 'suspended') {
    const note = prompt(status === 'suspended' ? 'Reason for suspension (internal)' : 'Reason for unsuspending (internal)');
    if (note === null) return;
    await rpc('admin_set_status', { p_user: user!.id, p_status: status, p_note: note });
    await search();
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Users</h1>
      <form className="row" onSubmit={(e) => (e.preventDefault(), search())}>
        <input
          aria-label="Handle or email"
          placeholder="u_8f3k2q or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <button className="primary">Search</button>
      </form>
      {error && <p className="error">{error}</p>}
      {user === null && <p className="muted">No user found.</p>}
      {user && (
        <section className="card stack">
          <strong>{user.handle}</strong>
          <span>
            Status: {user.status} · onboarding: {user.onboarding_step} · joined {new Date(user.created_at).toLocaleDateString()}
          </span>
          <span>
            {user.polls} polls · {user.votes} votes
          </span>
          <h2 style={{ margin: 0, fontSize: 18 }}>Moderation history</h2>
          {user.actions.length === 0 ? (
            <span className="muted">None</span>
          ) : (
            user.actions.map((a, i) => (
              <span key={i} className="faint">
                {new Date(a.at).toLocaleString()} · {a.action}
                {a.rule ? ` · ${a.rule}` : ''}
              </span>
            ))
          )}
          <div className="row">
            {user.status === 'suspended' ? (
              <button onClick={() => setStatus('active')}>Unsuspend</button>
            ) : user.status === 'active' ? (
              <button className="danger" onClick={() => setStatus('suspended')}>
                Suspend
              </button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
