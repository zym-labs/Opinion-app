// Sign in with Apple server calls: code exchange and token revocation.
// Secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8 contents), APPLE_BUNDLE_ID, APPLE_TOKEN_KEY (32-byte base64).
import { importPKCS8, SignJWT } from 'npm:jose@6';

const env = (k: string) => Deno.env.get(k) ?? '';

export const appleConfigured = () =>
  !!(env('APPLE_TEAM_ID') && env('APPLE_KEY_ID') && env('APPLE_PRIVATE_KEY') && env('APPLE_BUNDLE_ID') && env('APPLE_TOKEN_KEY'));

/** Apple's client secret: an ES256 JWT signed with the Sign in with Apple key, valid for 5 minutes. */
async function clientSecret() {
  const key = await importPKCS8(env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env('APPLE_KEY_ID') })
    .setIssuer(env('APPLE_TEAM_ID'))
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(env('APPLE_BUNDLE_ID'))
    .sign(key);
}

async function post(path: string, body: Record<string, string>) {
  return fetch(`https://appleid.apple.com/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('APPLE_BUNDLE_ID'), client_secret: await clientSecret(), ...body }),
  });
}

/** Exchanges the one-time authorization code from the app for a refresh token. */
export async function exchangeCode(code: string): Promise<string | null> {
  const res = await post('token', { code, grant_type: 'authorization_code' });
  if (!res.ok) {
    console.error('apple token exchange failed', res.status);
    return null;
  }
  const data = await res.json();
  return data.refresh_token ?? null;
}

export async function revokeRefreshToken(token: string) {
  const res = await post('revoke', { token, token_type_hint: 'refresh_token' });
  if (!res.ok) console.error('apple revoke failed', res.status);
  return res.ok;
}

// AES-GCM so the token is never stored in plain text.
async function aesKey() {
  const raw = Uint8Array.from(atob(env('APPLE_TOKEN_KEY')), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(text));
  const out = new Uint8Array(iv.length + data.byteLength);
  out.set(iv);
  out.set(new Uint8Array(data), iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decrypt(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await aesKey(), bytes.slice(12));
  return new TextDecoder().decode(data);
}
