// Registers an App Attest key for this user and device (once per install).
import { verifyAttestation } from 'npm:node-app-attest@1';
import { Buffer } from 'node:buffer';

import { admin, cors, fail, getUserId, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);
  const { keyId, attestation, challenge } = await req.json().catch(() => ({}));
  if (!keyId || !attestation || !challenge) return fail('INVALID_INPUT');

  // The challenge must be one we issued to this user, unused and fresh.
  const { data: issued } = await admin.from('integrity_challenges').delete()
    .eq('challenge', challenge).eq('user_id', userId).gt('expires_at', new Date().toISOString())
    .select('challenge').maybeSingle();
  if (!issued) return fail('CODE_INVALID');

  try {
    const { publicKey } = verifyAttestation({
      attestation: Buffer.from(attestation, 'base64'),
      challenge,
      keyId,
      bundleIdentifier: Deno.env.get('APPLE_BUNDLE_ID') ?? '',
      teamIdentifier: Deno.env.get('APPLE_TEAM_ID') ?? '',
      allowDevelopmentEnvironment: Deno.env.get('APP_ATTEST_ALLOW_DEV') === 'true',
    });
    await admin.from('device_keys').upsert({ user_id: userId, key_id: keyId, public_key: publicKey, sign_count: 0 });
    await admin.from('integrity_events').insert({ user_id: userId, action: 'attest', platform: 'ios', ok: true });
    return json({ ok: true });
  } catch (e) {
    await admin.from('integrity_events').insert({
      user_id: userId, action: 'attest', platform: 'ios', ok: false, reason: String(e).slice(0, 120),
    });
    return fail('INTEGRITY_FAILED');
  }
});
