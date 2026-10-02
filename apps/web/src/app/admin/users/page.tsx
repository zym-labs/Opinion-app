'use client';

// AD-04 User lookup by internal handle or email.
import { useState } from 'react';

import { RULES } from '@/lib/rules';
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
  const [rule, setRule] = useState('');

  async function search() {
    setError(null);
    try {
      setUser(await rpc<User | null>('admin_user', { p_query: query.trim() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  async function setStatus(status: 'active' | 'suspended') {
    if (status === 'suspended' && !rule) return setError('Pick the rule broken. The user is told which one.');
    const note = prompt(status === 'suspended' ? 'Internal note (not shown to the user)' : 'Reason for unsuspending (internal)');
    if (note === null) return;
    try {
      await rpc('admin_set_status', { p_user: user!.id, p_status: status, p_rule: status === 'suspended' ? rule : null, p_note: note });
      await search();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
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
              <>
                <select aria-label="Rule broken" value={rule} onChange={(e) => setRule(e.target.value)}>
                  <option value="">Rule broken…</option>
                  {RULES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button className="danger" onClick={() => setStatus('suspended')}>
                  Suspend
                </button>
              </>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
