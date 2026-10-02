// GDPR data export (Art. 15/20, STAGE4 §3.5): everything we hold about the caller, as JSON.
// Other people's identities are never included: polls show results only, votes only the caller's own.
import { admin, cors, fail, fromDbError, getUserId, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);

  const { error: rl } = await admin.rpc('hit_rate_limit', {
    p_user: userId, p_action: 'data_export', p_max: 3, p_window: '1 day',
  });
  if (rl) return fromDbError(rl);

  const [{ data: user }, profile, categories, communities, consents, polls, votes, credits, notifications, reports, hidden, experts, devices, campus, decisions, appeals] =
    await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from('profiles').select('handle, status, onboarding_step, birth_year, age_source, created_at').eq('id', userId).single(),
      admin.from('user_categories').select('categories(name)').eq('user_id', userId),
      admin.from('user_communities').select('joined_at, communities(name)').eq('user_id', userId),
      admin.from('consents').select('kind, version, accepted_at').eq('user_id', userId),
      admin.from('polls')
        .select('question, type, is_taste, status, duration_hours, published_at, closes_at, created_at, poll_options(side, label), poll_results(total_votes, pcts, winner, summary_majority, summary_minority), parent_poll_id')
        .eq('creator_id', userId),
      admin.from('votes')
        .select('side, predicted_side, feature_consent, verified_expert, created_at, polls(question), reasons(body)')
        .eq('voter_id', userId),
      admin.from('credit_ledger').select('delta, reason, created_at').eq('user_id', userId),
      admin.from('notifications').select('type, payload, created_at, read_at').eq('user_id', userId),
      admin.from('reports').select('target_type, reason, note, status, created_at').eq('reporter_id', userId),
      admin.from('hidden_creators').select('created_at, polls:source_poll_id(question)').eq('user_id', userId),
      // Added with later features: verified expertise, device integrity keys, campus verification.
      admin.from('expert_verifications').select('domain, verified_at, expires_at, categories(name)').eq('user_id', userId),
      admin.from('device_keys').select('verified_at').eq('user_id', userId),
      admin.from('campus_verifications').select('domain, verified_at, expires_at, communities(name)').eq('user_id', userId),
      // Moderation decisions about the caller and their appeals; moderator identities and internal notes are left out.
      admin.from('moderation_actions').select('action, rule, created_at').eq('target_user_id', userId),
      admin.from('appeals').select('message, status, created_at, resolved_at').eq('user_id', userId),
    ]);

  return json({
    exported_at: new Date().toISOString(),
    account: { email: user.user?.email ?? null, created_at: user.user?.created_at ?? null, ...profile.data },
    categories: categories.data ?? [],
    communities: communities.data ?? [],
    consents: consents.data ?? [],
    polls_created: polls.data ?? [],
    votes: votes.data ?? [],
    credits: credits.data ?? [],
    notifications: notifications.data ?? [],
    reports_submitted: reports.data ?? [],
    hidden_creators: hidden.data ?? [],
    expert_verifications: experts.data ?? [],
    campus_verifications: campus.data ?? [],
    moderation_decisions: decisions.data ?? [],
    appeals: appeals.data ?? [],
    integrity_keys_registered: (devices.data ?? []).length,
    note: 'Votes and reasons are shown to others only as anonymous totals and, if you agreed, anonymous quotes.',
  });
});
