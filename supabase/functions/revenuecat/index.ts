// Opinion+ entitlements from the App Store / Google Play, via RevenueCat webhooks.
// RevenueCat sends `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`; anything else is rejected.
// The app identifies users to RevenueCat with their Supabase user id, so app_user_id maps 1:1.
import { admin, fail, json } from '../_shared/http.ts';
import { type RcEvent, toEntitlement } from './events.ts';

const SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('INVALID_INPUT', 405);
  if (!SECRET || req.headers.get('authorization') !== `Bearer ${SECRET}`) return fail('UNAUTHENTICATED', 401);

  let event: RcEvent;
  try {
    event = ((await req.json()) as { event: RcEvent }).event;
  } catch {
    return fail('INVALID_INPUT');
  }
  const ent = event ? toEntitlement(event) : null;
  if (!ent) return json({ ignored: true });

  const { error } = await admin.rpc('set_subscription', {
    p_user: ent.userId,
    p_product: ent.product,
    p_active: ent.active,
    p_expires: ent.expires,
    p_store: ent.store,
  });
  // 500 makes RevenueCat retry later.
  if (error) return fail('INTERNAL', 500);
  return json({ ok: true });
});
