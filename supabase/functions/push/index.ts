// Push worker (STAGE4 §5): sends queued notifications through Expo Push.
import { admin, fail, isServiceCall, json } from '../_shared/http.ts';

const TEXT: Record<string, (p: Record<string, unknown>) => { title: string; body: string }> = {
  new_polls_digest: (p) => ({ title: 'New polls for you', body: `${p.count} new polls match your interests.` }),
  poll_ended: (p) => ({ title: 'Results are in', body: `“${p.question}” has closed. You can view the result once.` }),
  summary_ready: (p) => ({ title: 'Your poll results', body: `“${p.question}” is complete.` }),
  insight_featured: (p) => ({ title: 'Your reason was featured', body: `On “${p.question}”.` }),
  follow_up: (p) => ({ title: 'A follow-up to a poll you voted on', body: `“${p.question}”` }),
  decision_made: (p) => ({
    title: p.matched ? 'Your vote matched their decision' : 'The asker decided',
    body: `On “${p.question}” they went with ${p.chose}.`,
  }),
  decision_reminder: (p) => ({ title: 'What did you decide?', body: `Tell your voters what you chose on “${p.question}”.` }),
  last_call: (p) => ({ title: 'Closing soon: needs your view', body: `“${p.question}” needs ${p.votes_needed} more votes for a result.` }),
  moderation_outcome: (p) => {
    if (p.kind === 'appeal') return { title: 'Your appeal was reviewed', body: 'Open Opinion to see the outcome.' };
    if (p.kind === 'account_restored') return { title: 'Your account is active again', body: 'Welcome back to Opinion.' };
    if (p.kind !== 'author') return { title: 'Update on your report', body: 'A moderator reviewed something you reported. Thank you.' };
    const title = p.action === 'warn' ? 'A warning about your content' : p.action === 'suspend' ? 'Your account was suspended' : 'Your content was removed';
    return { title, body: 'Open Opinion to see which community guideline was broken and how to appeal.' };
  },
  circle_poll: (p) => ({ title: 'A friend wants your quick take', body: `“${p.question}”` }),
  reengage: (p) => ({
    title: p.step === 3 ? 'Polls in your topics are open' : p.step === 7 ? 'Your results are waiting' : 'New questions in your topics',
    body: p.step === 3 ? `${p.count} people are waiting for opinions like yours.` : p.step === 7 ? 'See how the room voted.' : 'Help someone decide.',
  }),
  decision_checkin: (p) => ({ title: 'A month on', body: `Glad about your decision on “${p.question}”?` }),
  info_requested: (p) => ({ title: 'People want more context', body: `On “${p.question}”. A follow-up with details could help.` }),
  boosted_poll: (p) => ({ title: 'Your view is wanted', body: `“${p.question}”` }),
  referral_credited: () => ({ title: 'A friend joined Opinion', body: 'You both earned a free poll.' }),
};

const ROUTE: Record<string, (pollId: string | null) => string> = {
  new_polls_digest: () => '/',
  poll_ended: (id) => `/result/${id}`,
  summary_ready: (id) => `/my-poll/${id}`,
  insight_featured: () => '/featured',
  follow_up: (id) => `/vote/${id}`,
  decision_made: () => '/notifications',
  decision_reminder: (id) => `/my-poll/${id}`,
  last_call: (id) => `/vote/${id}`,
  moderation_outcome: () => '/notifications',
  referral_credited: () => '/credits',
  boosted_poll: (id) => `/vote/${id}`,
  reengage: () => '/',
  circle_poll: (id) => `/vote/${id}`,
  decision_checkin: () => '/journal',
  info_requested: (id) => `/my-poll/${id}`,
};

Deno.serve(async (req) => {
  if (!isServiceCall(req)) return fail('UNAUTHENTICATED', 401);

  const { data: queued } = await admin.from('notifications').select('id, user_id, type, poll_id, payload')
    .is('sent_at', null).order('created_at').limit(500);
  if (!queued?.length) return json({ sent: 0 });

  const userIds = [...new Set(queued.map((n) => n.user_id))];
  const { data: devices } = await admin.from('devices').select('user_id, push_token').in('user_id', userIds);
  const tokens = new Map<string, string[]>();
  for (const d of devices ?? []) tokens.set(d.user_id, [...(tokens.get(d.user_id) ?? []), d.push_token]);

  const messages = queued.flatMap((n) =>
    (tokens.get(n.user_id) ?? []).map((to) => ({
      notificationId: n.id,
      msg: { to, ...TEXT[n.type](n.payload ?? {}), sound: 'default', data: { url: ROUTE[n.type](n.poll_id) } },
    })),
  );

  // A notification is only marked sent once Expo accepted its batch; failed batches retry next minute.
  const failed = new Set<string>();
  const invalid: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch.map((m) => m.msg)),
    }).catch(() => null);
    if (!res?.ok) {
      batch.forEach((m) => failed.add(m.notificationId));
      continue;
    }
    const { data } = await res.json();
    (data as { status: string; details?: { error?: string } }[]).forEach((t, j) => {
      if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') invalid.push(batch[j].msg.to);
    });
  }

  if (invalid.length) await admin.from('devices').delete().in('push_token', invalid);
  // Notifications without a device are marked sent too: results are always visible in the app.
  const done = queued.map((n) => n.id).filter((id) => !failed.has(id));
  if (done.length) await admin.from('notifications').update({ sent_at: new Date().toISOString() }).in('id', done);
  return json({ sent: messages.length });
});
