// Poll creation (STAGE4 §3.3): create a moderated draft, then publish after image checks.
import { admin, cors, fail, fromDbError, getUserId, json } from '../_shared/http.ts';
import { checkIntegrity } from '../_shared/integrity.ts';
import { targetsPrivatePerson } from '../_shared/ai.ts';
import { isCrisis, moderate, moderateText, NEW_ACCOUNT_THRESHOLD } from '../_shared/moderation.ts';

const SIDES = ['a', 'b', 'c', 'd'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);
  const raw = await req.text();
  // deno-lint-ignore no-explicit-any -- request JSON is validated field by field below
  let body: Record<string, any>;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return fail('INVALID_INPUT');
  }

  if (body.action === 'create') {
    // Validate enums and ranges here so bad input is a 400, not a database 500.
    if (body.type !== 'expert' && body.type !== 'community') return fail('INVALID_INPUT', 400, 'Unknown poll type');
    const hours = Number(body.duration_hours);
    // Up to 24h for everyone; 25–48h needs Opinion+ (checked by the database).
    if (!Number.isInteger(hours) || hours < 3 || hours > 48) return fail('INVALID_INPUT', 400, 'Duration must be 3–48 hours');
    const question = String(body.question ?? '').trim();
    // 2–4 options; each needs text, an image, or both.
    const rawLabels: unknown[] = Array.isArray(body.labels) ? body.labels : [];
    const images: unknown[] = Array.isArray(body.images) ? body.images : [];
    const labels = rawLabels.map((l) => (typeof l === 'string' && l.trim() ? l.trim() : null));
    if (question.length < 5 || question.length > 120) return fail('INVALID_INPUT', 400, 'Question must be 5–120 characters');
    if (labels.length < 2 || labels.length > 4) return fail('INVALID_INPUT', 400, 'Polls have 2 to 4 options');
    if (labels.some((l) => (l?.length ?? 0) > 60)) return fail('INVALID_INPUT');
    const missing = labels.findIndex((l, i) => !l && !images[i]);
    if (missing >= 0) return fail('INVALID_INPUT', 400, `Option ${SIDES[missing].toUpperCase()} needs text or an image`);

    const { data: isNew } = await admin.rpc('is_new_account', { p_user: userId });
    const strict = isNew ? NEW_ACCOUNT_THRESHOLD : undefined;
    const mod = await moderateText([question, ...labels], strict);
    if (isCrisis([question, ...labels], mod)) return fail('CRISIS_SUPPORT');
    if (mod.state === 'rejected') return fail('CONTENT_REJECTED');
    // Questions that single out an identifiable private person are not allowed (anti-bullying).
    if (await targetsPrivatePerson([question, ...labels.filter((l): l is string => !!l)])) return fail('TARGETS_PERSON');

    const { data: pollId, error } = await admin.rpc('create_poll_draft', {
      p_user: userId,
      p_type: body.type,
      p_is_taste: !!body.is_taste,
      p_question: question,
      p_labels: labels,
      p_categories: body.category_ids ?? [],
      p_age_min: body.age_min ?? null,
      p_age_max: body.age_max ?? null,
      p_community: body.community_id ?? null,
      p_duration: hours,
      p_moderation: mod.state,
    });
    if (error) return fromDbError(error);
    if (body.parent_poll_id) {
      const { error: linkError } = await admin.rpc('set_follow_up_parent', {
        p_user: userId, p_poll: pollId, p_parent: body.parent_poll_id,
      });
      if (linkError) return fromDbError(linkError);
    }
    // Image slots: the app uploads to poll-images/<poll_id>/<side>.jpg next.
    for (const [i, side] of SIDES.slice(0, labels.length).entries()) {
      if (images[i]) {
        await admin.from('poll_options').update({ image_path: `${pollId}/${side}.jpg`, image_moderation: 'pending' })
          .eq('poll_id', pollId).eq('side', side);
      }
    }
    return json({ poll_id: pollId });
  }

  if (body.action === 'publish') {
    if (!(await checkIntegrity(req, userId, raw, 'publish'))) return fail('INTEGRITY_FAILED', 403);
    const pollId = String(body.poll_id ?? '');
    const { data: poll } = await admin.from('polls').select('id, creator_id').eq('id', pollId).maybeSingle();
    if (!poll || poll.creator_id !== userId) return fail('POLL_NOT_FOUND', 404);

    // Moderate uploaded images before the poll can go live.
    const { data: options } = await admin.from('poll_options').select('side, image_path, image_moderation')
      .eq('poll_id', pollId).not('image_path', 'is', null);
    for (const o of options ?? []) {
      if (o.image_moderation === 'approved') continue;
      const { data: signed } = await admin.storage.from('poll-images').createSignedUrl(o.image_path, 300);
      if (!signed) return fail('IMAGE_PENDING');
      const { data: isNew } = await admin.rpc('is_new_account', { p_user: userId });
      const mod = await moderate([{ type: 'image_url', image_url: { url: signed.signedUrl } }], isNew ? NEW_ACCOUNT_THRESHOLD : undefined);
      await admin.from('poll_options').update({ image_moderation: mod.state }).eq('poll_id', pollId).eq('side', o.side);
      if (mod.state === 'rejected') return fail('CONTENT_REJECTED');
    }

    const { data: closesAt, error } = await admin.rpc('publish_poll_internal', {
      p_user: userId,
      p_poll: pollId,
      p_friends_only: body.friends_only === true,
    });
    if (error) return fromDbError(error);
    return json({ closes_at: closesAt });
  }

  return fail('INVALID_INPUT');
});
