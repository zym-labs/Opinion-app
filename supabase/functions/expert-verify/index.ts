// Verified experts: a code sent to a professional/academic email on an allow-listed domain for a
// category. Only a hash of the address is stored, and it is never linked to votes shown to others.
import { admin, cors, fail, fromDbError, getUserId, json, sha256 } from '../_shared/http.ts';

const PEPPER = Deno.env.get('EMAIL_HASH_PEPPER') ?? 'dev-pepper';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('EMAIL_FROM') ?? 'Opinion <no-reply@example.com>';

async function sendCode(email: string, code: string, category: string) {
  if (!RESEND_KEY) {
    console.warn(`RESEND_API_KEY not set: expert code for ${email.replace(/^.+@/, '***@')} is ${code}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: `${code} is your Opinion verification code`,
      text: `Your code to verify as a ${category} expert on Opinion is ${code}. It expires in 10 minutes.\n\nYour address is not shown to anyone. If you didn't ask for this, ignore this email.`,
    }),
  });
  if (!res.ok) throw new Error(`email failed: ${res.status}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);
  const body = await req.json().catch(() => ({}));
  const categoryId = Number(body.category_id);
  if (!Number.isInteger(categoryId)) return fail('INVALID_INPUT');

  // Only categories the user picked can be verified.
  const { data: picked } = await admin.from('user_categories').select('category_id, categories(name)')
    .eq('user_id', userId).eq('category_id', categoryId).maybeSingle();
  if (!picked) return fail('NOT_ELIGIBLE');
  const categoryName = (picked as unknown as { categories: { name: string } }).categories?.name ?? 'category';

  if (body.action === 'send') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const domain = email.split('@')[1] ?? '';
    // Subdomains count: a@ed.ac.uk matches the allow-listed "ac.uk".
    const { data: domains } = await admin.from('expert_domains').select('domain').eq('category_id', categoryId);
    const ok = (domains ?? []).some((d) => domain === d.domain || domain.endsWith(`.${d.domain}`));
    if (!ok) return fail('DOMAIN_NOT_ALLOWED');

    const { error: rl } = await admin.rpc('hit_rate_limit', {
      p_user: userId, p_action: 'expert_code', p_max: 5, p_window: '1 hour',
    });
    if (rl) return fromDbError(rl);

    const emailHash = await sha256(`${PEPPER}:expert:${email}`);
    const { data: used } = await admin.from('expert_verifications').select('user_id')
      .eq('category_id', categoryId).eq('email_hash', emailHash).maybeSingle();
    if (used && used.user_id !== userId) return fail('EMAIL_ALREADY_USED');

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    await admin.from('expert_codes').upsert({
      user_id: userId, category_id: categoryId, email_hash: emailHash, domain,
      code_hash: await sha256(`${PEPPER}:${code}`), attempts: 0,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    await sendCode(email, code, categoryName);
    return json({ ok: true });
  }

  if (body.action === 'verify') {
    const { data: row } = await admin.from('expert_codes').select('*')
      .eq('user_id', userId).eq('category_id', categoryId).maybeSingle();
    if (!row || new Date(row.expires_at) < new Date() || row.attempts >= 5) return fail('CODE_INVALID');
    if (row.code_hash !== await sha256(`${PEPPER}:${String(body.code ?? '')}`)) {
      await admin.from('expert_codes').update({ attempts: row.attempts + 1 })
        .eq('user_id', userId).eq('category_id', categoryId);
      return fail('CODE_INVALID');
    }
    const { error } = await admin.from('expert_verifications').upsert({
      user_id: userId, category_id: categoryId, email_hash: row.email_hash, domain: row.domain,
      verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
    });
    if (error) return fail(error.code === '23505' ? 'EMAIL_ALREADY_USED' : 'INTERNAL', error.code === '23505' ? 400 : 500);
    await admin.from('expert_codes').delete().eq('user_id', userId).eq('category_id', categoryId);
    return json({ ok: true });
  }

  return fail('INVALID_INPUT');
});
