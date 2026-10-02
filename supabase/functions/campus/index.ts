// Campus email verification (STAGE2 §5): code by email, only a hash of the address is stored.
import { admin, cors, fail, fromDbError, getUserId, json, sha256, userClient } from '../_shared/http.ts';

const PEPPER = Deno.env.get('EMAIL_HASH_PEPPER') ?? 'dev-pepper';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('EMAIL_FROM') ?? 'Opinion <no-reply@example.com>';

async function sendCode(email: string, code: string) {
  if (!RESEND_KEY) {
    console.warn(`RESEND_API_KEY not set: campus code for ${email.replace(/^.+@/, '***@')} is ${code}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: `${code} is your Opinion campus code`,
      text: `Your Opinion campus verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, ignore this email.`,
    }),
  });
  if (!res.ok) throw new Error(`email failed: ${res.status}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);
  const body = await req.json().catch(() => ({}));
  const communityId = String(body.community_id ?? '');

  if (body.action === 'send') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const domain = email.split('@')[1] ?? '';
    const { data: allowed } = await admin.from('community_domains').select('domain')
      .eq('community_id', communityId).eq('domain', domain).maybeSingle();
    if (!allowed) return fail('DOMAIN_NOT_ALLOWED');

    const { error: rl } = await admin.rpc('hit_rate_limit', {
      p_user: userId, p_action: 'campus_code', p_max: 5, p_window: '1 hour',
    });
    if (rl) return fromDbError(rl);

    const emailHash = await sha256(`${PEPPER}:${email}`);
    const { data: used } = await admin.from('campus_verifications').select('user_id').eq('email_hash', emailHash).maybeSingle();
    if (used && used.user_id !== userId) return fail('EMAIL_ALREADY_USED');

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    await admin.from('campus_codes').upsert({
      user_id: userId, community_id: communityId, email_hash: emailHash, domain,
      code_hash: await sha256(`${PEPPER}:${code}`), attempts: 0,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    await sendCode(email, code);
    return json({ ok: true });
  }

  if (body.action === 'verify') {
    const { data: row } = await admin.from('campus_codes').select('*')
      .eq('user_id', userId).eq('community_id', communityId).maybeSingle();
    if (!row || new Date(row.expires_at) < new Date() || row.attempts >= 5) return fail('CODE_INVALID');
    if (row.code_hash !== await sha256(`${PEPPER}:${String(body.code ?? '')}`)) {
      await admin.from('campus_codes').update({ attempts: row.attempts + 1 })
        .eq('user_id', userId).eq('community_id', communityId);
      return fail('CODE_INVALID');
    }
    await admin.from('campus_verifications').delete().eq('user_id', userId).eq('community_id', communityId);
    const { error } = await admin.from('campus_verifications').insert({
      user_id: userId, community_id: communityId, email_hash: row.email_hash, domain: row.domain,
    });
    if (error) return fail(error.code === '23505' ? 'EMAIL_ALREADY_USED' : 'INTERNAL', error.code === '23505' ? 400 : 500);
    await admin.from('campus_codes').delete().eq('user_id', userId).eq('community_id', communityId);
    const { error: joinError } = await userClient(req).rpc('join_community', { p_community: communityId });
    if (joinError) return fromDbError(joinError);
    return json({ ok: true });
  }

  return fail('INVALID_INPUT');
});
