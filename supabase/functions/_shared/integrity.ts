// Device integrity checks for sensitive requests (votes, poll publishing).
// iOS: App Attest assertion over the exact request body, verified with the key registered by /integrity.
// Android: Play Integrity standard token whose requestHash is the SHA-256 of the request body.
//
// INTEGRITY_MODE: 'off' | 'report' (default: log, never block) | 'enforce' (reject failures).
// Secrets: APPLE_TEAM_ID, APPLE_BUNDLE_ID, ANDROID_PACKAGE, GOOGLE_SERVICE_ACCOUNT_JSON.
import { importPKCS8, SignJWT } from 'npm:jose@6';
import { verifyAssertion } from 'npm:node-app-attest@1';
import { Buffer } from 'node:buffer';

import { admin, sha256 } from './http.ts';

const env = (k: string) => Deno.env.get(k) ?? '';
export const integrityMode = () => (env('INTEGRITY_MODE') || 'report') as 'off' | 'report' | 'enforce';

type Result = { ok: boolean; reason?: string; platform?: string };

async function checkIos(req: Request, userId: string, body: string): Promise<Result> {
  const keyId = req.headers.get('X-Integrity-Key');
  const assertion = req.headers.get('X-Integrity-Token');
  if (!keyId || !assertion) return { ok: false, reason: 'missing_assertion' };
  const { data: key } = await admin.from('device_keys').select('public_key, sign_count')
    .eq('user_id', userId).eq('key_id', keyId).maybeSingle();
  if (!key) return { ok: false, reason: 'unknown_key' };
  try {
    const { signCount } = verifyAssertion({
      assertion: Buffer.from(assertion, 'base64'),
      payload: body,
      publicKey: key.public_key,
      bundleIdentifier: env('APPLE_BUNDLE_ID'),
      teamIdentifier: env('APPLE_TEAM_ID'),
      signCount: key.sign_count,
    });
    // Replay protection: the counter must grow with every assertion.
    const { count } = await admin.from('device_keys').update({ sign_count: signCount }, { count: 'exact' })
      .eq('user_id', userId).eq('key_id', keyId).lt('sign_count', signCount);
    return count ? { ok: true } : { ok: false, reason: 'replayed_assertion' };
  } catch (e) {
    return { ok: false, reason: `assertion_invalid: ${String(e).slice(0, 80)}` };
  }
}

let googleToken: { value: string; exp: number } | null = null;

async function googleAccessToken() {
  if (googleToken && googleToken.exp > Date.now() + 60_000) return googleToken.value;
  const sa = JSON.parse(env('GOOGLE_SERVICE_ACCOUNT_JSON'));
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/playintegrity' })
    .setProtectedHeader({ alg: 'RS256', kid: sa.private_key_id })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(await importPKCS8(sa.private_key, 'RS256'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await res.json();
  googleToken = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return googleToken.value;
}

async function checkAndroid(req: Request, body: string): Promise<Result> {
  const token = req.headers.get('X-Integrity-Token');
  if (!token) return { ok: false, reason: 'missing_token' };
  if (!env('GOOGLE_SERVICE_ACCOUNT_JSON')) return { ok: false, reason: 'server_not_configured' };
  const res = await fetch(
    `https://playintegrity.googleapis.com/v1/${env('ANDROID_PACKAGE')}:decodeIntegrityToken`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${await googleAccessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrity_token: token }),
    },
  );
  if (!res.ok) return { ok: false, reason: `decode_failed_${res.status}` };
  const v = (await res.json()).tokenPayloadExternal ?? {};
  if (v.requestDetails?.requestHash !== (await sha256(body))) return { ok: false, reason: 'hash_mismatch' };
  if (Date.now() - Number(v.requestDetails?.timestampMillis ?? 0) > 5 * 60_000) return { ok: false, reason: 'stale_token' };
  if (v.appIntegrity?.appRecognitionVerdict !== 'PLAY_RECOGNIZED') return { ok: false, reason: 'app_not_recognized' };
  if (!(v.deviceIntegrity?.deviceRecognitionVerdict ?? []).includes('MEETS_DEVICE_INTEGRITY')) {
    return { ok: false, reason: 'device_integrity' };
  }
  return { ok: true };
}

/** Returns true when the request may proceed (always true unless INTEGRITY_MODE=enforce). */
export async function checkIntegrity(req: Request, userId: string, body: string, action: string): Promise<boolean> {
  const mode = integrityMode();
  if (mode === 'off') return true;
  const platform = req.headers.get('X-Integrity-Platform') ?? 'unknown';
  let result: Result;
  try {
    result =
      platform === 'ios' ? await checkIos(req, userId, body)
      : platform === 'android' ? await checkAndroid(req, body)
      : { ok: false, reason: 'unsupported_platform' };
  } catch (e) {
    result = { ok: false, reason: `error: ${String(e).slice(0, 80)}` };
  }
  await admin.from('integrity_events').insert({ user_id: userId, action, platform, ok: result.ok, reason: result.reason ?? null });
  return result.ok || mode !== 'enforce';
}
