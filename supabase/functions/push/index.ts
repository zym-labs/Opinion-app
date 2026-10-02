// Push worker (STAGE4 §5): sends queued notifications through Expo Push.
import { admin, fail, isServiceCall, json } from '../_shared/http.ts';

const TEXT: Record<string, (p: Record<string, unknown>) => { title: string; body: string }> = {
  new_polls_digest: (p) => ({ title: 'New polls for you', body: `${p.count} new polls match your interests.` }),
  poll_ended: (p) => ({ title: 'Results are in', body: `“${p.question}” has closed. You can view the result once.` }),
  summary_ready: (p) => ({ title: 'Your poll results', body: `“${p.question}” is complete.` }),
  insight_featured: (p) => ({ title: 'Your reason was featured', body: `On “${p.question}”.` }),
  moderation_outcome: (p) =>
    p.kind === 'author'
      ? {
          title: p.action === 'warn' ? 'A warning about your content' : 'Your content was removed',
          body: 'Open Opinion to see which community guideline it broke and how to appeal.',
        }
      : { title: 'Update on your report', body: 'A moderator reviewed something you reported. Thank you.' },
};

const ROUTE: Record<string, (pollId: string | null) => string> = {
  new_polls_digest: () => '/',
  poll_ended: (id) => `/result/${id}`,
  summary_ready: (id) => `/my-poll/${id}`,
  insight_featured: () => '/featured',
  moderation_outcome: () => '/notifications',
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
      to,
      ...TEXT[n.type](n.payload ?? {}),
      sound: 'default',
      data: { url: ROUTE[n.type](n.poll_id) },
    })),
  );

  const invalid: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) continue;
    const { data } = await res.json();
    (data as { status: string; details?: { error?: string } }[]).forEach((t, j) => {
      if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') invalid.push(batch[j].to);
    });
  }

  if (invalid.length) await admin.from('devices').delete().in('push_token', invalid);
  // Marked sent even without a device: results are always visible in the app.
  await admin.from('notifications').update({ sent_at: new Date().toISOString() }).in('id', queued.map((n) => n.id));
  return json({ sent: messages.length });
});
