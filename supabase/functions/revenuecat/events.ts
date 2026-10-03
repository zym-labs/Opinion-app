// Maps a RevenueCat webhook event to an Opinion+ entitlement change. Pure, so it can be unit-tested.

export type RcEvent = {
  type: string;
  app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  store?: string;
};

export type Entitlement = { userId: string; product: string; active: boolean; expires: string | null; store: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Still entitled until expiry: purchases, renewals, cancellations (auto-renew off) and billing retries.
const ENTITLED = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE', 'CANCELLATION', 'BILLING_ISSUE']);
const ENDED = new Set(['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED']);

/** null = ignore (test events, transfers, unknown users). */
export function toEntitlement(e: RcEvent): Entitlement | null {
  if (!e.app_user_id || !UUID.test(e.app_user_id)) return null;
  const expires = e.expiration_at_ms ? new Date(e.expiration_at_ms).toISOString() : null;
  const base = { userId: e.app_user_id, product: e.product_id ?? 'opinion_plus', expires, store: e.store ?? null };
  if (ENTITLED.has(e.type)) return { ...base, active: true };
  if (ENDED.has(e.type)) return { ...base, active: false };
  return null;
}
