// Account deletion (STAGE2 §7, Apple 5.1.1(v)).
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
  const paths = (polls ?? []).flatMap((p) => [`${p.id}/a.jpg`, `${p.id}/b.jpg`]);
  if (paths.length) await admin.storage.from('poll-images').remove(paths);

  // TODO(Phase 7): revoke the Sign in with Apple token via Apple's REST API. This needs the
  // Apple refresh token, which requires exchanging the authorization code at sign-in.
  const { error: delError } = await admin.auth.admin.deleteUser(userId);
  if (delError) return fail('INTERNAL', 500);
  return json({ ok: true });
});
