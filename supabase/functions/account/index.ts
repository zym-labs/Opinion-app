// Account deletion (STAGE2 §7, Apple 5.1.1(v)).
import { appleConfigured, decrypt, revokeRefreshToken } from '../_shared/apple.ts';
import { admin, cors, fail, getUserId, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'DELETE') return fail('INVALID_INPUT', 405);
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);

  const { error } = await admin.rpc('prepare_account_deletion', { p_user: userId });
  if (error) return fail('INTERNAL', 500);

  // Images of polls that were removed by the deletion.
  const { data: polls } = await admin.from('polls').select('id').eq('creator_id', userId).eq('status', 'removed');
  // Polls have up to 4 options (a–d).
  const paths = (polls ?? []).flatMap((p) => ['a', 'b', 'c', 'd'].map((side) => `${p.id}/${side}.jpg`));
  if (paths.length) await admin.storage.from('poll-images').remove(paths);

  // Sign in with Apple: revoke the token before the account (and its stored token) is deleted.
  const { data: apple } = await admin.from('apple_tokens').select('refresh_token_enc').eq('user_id', userId).maybeSingle();
  if (apple && appleConfigured()) {
    await revokeRefreshToken(await decrypt(apple.refresh_token_enc)).catch((e) => console.error('apple revoke', e));
  }

  const { error: delError } = await admin.auth.admin.deleteUser(userId);
  if (delError) return fail('INTERNAL', 500);
  return json({ ok: true });
});
