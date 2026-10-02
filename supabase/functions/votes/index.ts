// Voting (STAGE4 §3.2): the reason is moderated before the vote is saved.
import { admin, cors, fail, fromDbError, getUserId, json } from '../_shared/http.ts';
import { checkIntegrity } from '../_shared/integrity.ts';
import { looksLikeInjection, moderateText, redactPii } from '../_shared/moderation.ts';

// Idempotency for retried requests (per instance): bounded, short-lived, and tied to the exact body.
const SEEN_MAX = 1000;
const SEEN_TTL_MS = 10 * 60_000;
const seen = new Map<string, { body: string; result: unknown; at: number }>();
function remember(key: string, body: string, result: unknown) {
  seen.set(key, { body, result, at: Date.now() });
  while (seen.size > SEEN_MAX) seen.delete(seen.keys().next().value!);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);

  const key = req.headers.get('Idempotency-Key');
  const cacheKey = key ? `${userId}:${key}` : null;
  // Read raw text: integrity tokens sign the exact body.
  const raw = await req.text();
  const cached = cacheKey ? seen.get(cacheKey) : undefined;
  if (cached && cached.body === raw && Date.now() - cached.at < SEEN_TTL_MS) return json(cached.result);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return fail('INVALID_INPUT');
  }
  if (!(await checkIntegrity(req, userId, raw, 'vote'))) return fail('INTEGRITY_FAILED', 403);
  const isSide = (x: unknown) => x === 'a' || x === 'b' || x === 'c' || x === 'd';
  const side = isSide(body.side) ? body.side : null;
  if (!side) return fail('INVALID_INPUT');
  const predicted = isSide(body.predicted_side) ? body.predicted_side : null;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > 200) return fail('REASON_TOO_LONG');

  const mod = reason ? await moderateText([reason]) : { state: 'approved' as const, flags: null };

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
  if (cacheKey) remember(cacheKey, raw, result);
  return json(result);
});
