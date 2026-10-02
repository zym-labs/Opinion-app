// A-05 age gate (STAGE2 §4). Under 18 → the account is deleted immediately.
import { admin, cors, fail, fromDbError, getUserId, json, userClient } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const userId = await getUserId(req);
  if (!userId) return fail('UNAUTHENTICATED', 401);

  const { birth_year, store_says_adult } = await req.json().catch(() => ({}));
  const year = Number(birth_year);
  const age = new Date().getFullYear() - year;
  if (!Number.isInteger(year) || year < 1900) return fail('INVALID_INPUT');

  // The store's age signal wins when present (Declared Age Range / Play Age Signals).
  if (age < 18 || store_says_adult === false) {
    await admin.auth.admin.deleteUser(userId);
    return fail('AGE_BLOCKED', 403);
  }

  const { error } = await userClient(req).rpc('set_birth_year', {
    p_birth_year: year,
    p_source: store_says_adult === true ? 'store_signal' : 'self',
  });
  if (error) return fromDbError(error);
  return json({ ok: true });
});
