// Room mode: create an in-person group decision. The text is moderated like a poll (including the crisis
// safety net and the named-person check); joining, voting and revealing are plain RPCs.
import { targetsPrivatePerson } from '../_shared/ai.ts';
import { admin, cors, fail, fromDbError, getUserId, json } from '../_shared/http.ts';
import { isCrisis, moderateText } from '../_shared/moderation.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);

  const body = await req.json().catch(() => ({}));
  const question = String(body.question ?? '').trim();
  const labels: string[] = Array.isArray(body.labels) ? body.labels.map((l: unknown) => String(l ?? '').trim()).filter(Boolean) : [];
  const minutes = Number(body.minutes ?? 30);
  if (question.length < 5 || question.length > 120) return fail('INVALID_INPUT', 400, 'Question must be 5–120 characters');
  if (labels.length < 2 || labels.length > 4 || labels.some((l) => l.length > 60)) return fail('INVALID_INPUT', 400, 'Rooms have 2 to 4 options');

  const mod = await moderateText([question, ...labels]);
  if (isCrisis([question, ...labels], mod)) {
    // Counted per day and campus only, no identity (campus safety partnership).
    await admin.rpc('record_crisis', { p_user: userId });
    return fail('CRISIS_SUPPORT');
  }
  if (mod.state === 'rejected') return fail('CONTENT_REJECTED');
  if (await targetsPrivatePerson([question, ...labels])) return fail('TARGETS_PERSON');

  const { data: code, error } = await admin.rpc('create_room_internal', {
    p_user: userId,
    p_question: question,
    p_labels: labels,
    p_minutes: Number.isFinite(minutes) ? minutes : 30,
  });
  if (error) return fromDbError(error);
  return json({ code });
});
