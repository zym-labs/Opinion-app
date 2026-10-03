'use client';

// Sign in (existing Opinion accounts only), show who is asking and what they can do, then approve or deny.
// Supabase returns the redirect URL back to the requesting app with the code (or an error) attached.
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type Details = { client: { name: string; uri: string; logo_uri: string }; scope: string; user: { email: string } };

const CAN = [
  'Post a poll for you, after asking you first in the chat (uses one of your poll credits)',
  'See your recent polls and, once they close, their results and AI summary',
  'See the topics you follow',
];
const CANNOT = [
  'See who voted or how anyone voted',
  'Read your journal, notes, close friends or notifications',
  'Change your account or spend money',
];

export function Consent({ authorizationId }: { authorizationId: string }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const here = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error: e }) => {
      if (e || !data) return setError(e?.message ?? 'This request has expired. Start again from the app.');
      // Already approved before: go straight back.
      if ('redirect_url' in data) window.location.href = data.redirect_url;
      else setDetails(data as Details);
    });
  }, [session, authorizationId]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const decide = (approve: boolean) =>
    run(async () => {
      const { data, error: e } = approve
        ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
        : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
      if (e || !data) throw e ?? new Error('Could not complete the request');
      window.location.href = data.redirect_url;
    });

  if (session === undefined) return <p className="muted">Loading…</p>;

  if (!session) {
    return (
      <div className="stack">
        <h1 style={{ margin: 0 }}>Sign in to Opinion</h1>
        <p className="muted">Use the account you already have in the Opinion app.</p>
        <button onClick={() => run(() => supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: here } }))}>Continue with Apple</button>
        <button onClick={() => run(() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here } }))}>Continue with Google</button>
        {!sent ? (
          <form className="stack" onSubmit={(e) => (e.preventDefault(), run(async () => {
            const { error: e2 } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
            if (e2) throw e2;
            setSent(true);
          }))}>
            <label className="stack">
              Or your email
              <input type="email" required value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button disabled={busy}>Send a sign-in code</button>
          </form>
        ) : (
          <form className="stack" onSubmit={(e) => (e.preventDefault(), run(async () => {
            const { error: e2 } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
            if (e2) throw e2;
          }))}>
            <label className="stack">
              6-digit code
              <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            </label>
            <button className="primary" disabled={busy || code.length < 6}>Sign in</button>
          </form>
        )}
        <p className="faint">No account yet? Get the Opinion app first: it’s for people aged 18 and over.</p>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (!details) return error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>;

  return (
    <div className="stack">
      {/* eslint-disable-next-line @next/next/no-img-element -- third-party logo from the requesting app's own domain */}
      {details.client.logo_uri ? <img src={details.client.logo_uri} alt="" width={48} height={48} style={{ borderRadius: 12 }} /> : null}
      <h1 style={{ margin: 0 }}>Connect {details.client.name} to Opinion?</h1>
      <p className="muted">
        Signed in as {details.user.email}. {details.client.uri ? <>Requested by {new URL(details.client.uri).host}.</> : null}
      </p>
      <section className="card stack">
        <strong>It will be able to</strong>
        <ul style={{ margin: 0 }}>{CAN.map((c) => <li key={c}>{c}</li>)}</ul>
        <strong>It will never</strong>
        <ul style={{ margin: 0 }}>{CANNOT.map((c) => <li key={c}>{c}</li>)}</ul>
      </section>
      <p className="faint">You can disconnect it any time in the Opinion app: Settings → Connected apps.</p>
      <div className="row">
        <button className="primary" disabled={busy} onClick={() => decide(true)}>
          Allow
        </button>
        <button disabled={busy} onClick={() => decide(false)}>
          Deny
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
