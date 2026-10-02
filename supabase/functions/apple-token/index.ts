// Stores the Sign in with Apple refresh token (encrypted) so it can be revoked on account deletion.
import { appleConfigured, encrypt, exchangeCode } from '../_shared/apple.ts';
import { admin, cors, fail, getUserId, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);
  if (!appleConfigured()) return json({ stored: false });

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== 'string' || !code) return fail('INVALID_INPUT');
  const token = await exchangeCode(code);
  if (!token) return json({ stored: false });

  await admin.from('apple_tokens').upsert({ user_id: userId, refresh_token_enc: await encrypt(token) });
  return json({ stored: true });
});
