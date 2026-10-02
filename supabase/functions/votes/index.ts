// Voting (STAGE4 §3.2): the reason is moderated before the vote is saved.
import { admin, cors, fail, fromDbError, getUserId, json } from '../_shared/http.ts';
import { looksLikeInjection, moderateText, redactPii } from '../_shared/moderation.ts';

const seen = new Map<string, unknown>(); // idempotency, per instance

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);

  const key = req.headers.get('Idempotency-Key');
  if (key && seen.has(`${userId}:${key}`)) return json(seen.get(`${userId}:${key}`));

  const body = await req.json().catch(() => ({}));
  const side = body.side === 'a' || body.side === 'b' ? body.side : null;
  if (!side) return fail('INVALID_INPUT');
  const predicted = body.predicted_side === 'a' || body.predicted_side === 'b' ? body.predicted_side : null;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > 200) return fail('REASON_TOO_LONG');

  const mod = reason ? await moderateText(reason) : { state: 'approved' as const, flags: null };

  const { data: closesAt, error } = await admin.rpc('cast_vote_internal', {
    p_user: userId,
    p_poll: body.poll_id,
    p_side: side,
    p_reason: reason || null,
    p_predicted: predicted,
    p_consent: body.feature_consent === true,
    p_reason_moderation: mod.state,
    p_flags: mod.flags,
  });
  if (error) return fromDbError(error);

  if (reason) {
    const { data: vote } = await admin.from('votes').select('id').eq('poll_id', body.poll_id).eq('voter_id', userId).single();
    await admin.from('reasons').update({ pii_redacted: redactPii(reason), injection_flag: looksLikeInjection(reason) })
      .eq('vote_id', vote!.id);
  }

  const { data: credits } = await admin.rpc('credit_units', { p_user: userId });
  const result = { closes_at: closesAt, credit_units: credits ?? 0 };
  if (key) seen.set(`${userId}:${key}`, result);
  return json(result);
});
