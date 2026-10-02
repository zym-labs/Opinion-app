'use client';

// AD-01: staff sign in with an email code, then a TOTP second factor (admin calls require aal2).
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';

import { rpc, supabase } from '@/lib/supabase';

type Stage = 'loading' | 'email' | 'code' | 'enroll' | 'mfa' | 'denied' | 'ready';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function evaluate(s: Session | null) {
    setSession(s);
    if (!s) return setStage('email');
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') {
      try {
        await rpc('admin_metrics', { p_days: 1 });
        setStage('ready');
      } catch {
        setStage('denied');
      }
      return;
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp.find((f) => f.status === 'verified');
    if (totp) {
      setFactorId(totp.id);
      setStage('mfa');
    } else {
      // Remove abandoned, unverified setups first so they don't pile up to the factor limit.
      for (const f of factors?.all ?? []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (e || !data) return setError(e?.message ?? 'Could not start two-factor setup');
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setStage('enroll');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) evaluate(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  const sendCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (e) throw e;
      setCode('');
      setStage('code');
    });

  const verifyCode = () =>
    run(async () => {
      const { data, error: e } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (e) throw e;
      setCode('');
      await evaluate(data.session);
    });

  const verifyTotp = () =>
    run(async () => {
      const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId!, code });
      if (e) throw e;
      const { data } = await supabase.auth.getSession();
      await evaluate(data.session);
    });

  if (stage === 'ready') return <>{children}</>;

  return (
    <main className="container stack" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h1>Opinion admin</h1>
      {stage === 'loading' && <p className="muted">Loading…</p>}
      {stage === 'email' && (
        <form className="stack" onSubmit={(e) => (e.preventDefault(), sendCode())}>
          <label className="stack">
            Staff email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <button className="primary">Send code</button>
        </form>
      )}
      {(stage === 'code' || stage === 'mfa' || stage === 'enroll') && (
        <form className="stack" onSubmit={(e) => (e.preventDefault(), stage === 'code' ? verifyCode() : verifyTotp())}>
          {stage === 'enroll' && qr && (
            <>
              <p className="muted">Set up two-factor authentication: scan this with an authenticator app.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Two-factor QR code" width={200} height={200} />
            </>
          )}
          <label className="stack">
            {stage === 'code' ? 'Code from your email' : 'Code from your authenticator app'}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
          <button className="primary">Verify</button>
        </form>
      )}
      {stage === 'denied' && (
        <>
          <p>This account ({session?.user.email}) doesn’t have admin access.</p>
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </main>
  );
}
