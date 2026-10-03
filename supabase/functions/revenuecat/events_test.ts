import { assertEquals } from 'jsr:@std/assert@1';

import { toEntitlement } from './events.ts';

const user = '00000000-0000-0000-0000-000000000001';

Deno.test('purchase and renewal grant Opinion+ until expiry', () => {
  const e = toEntitlement({ type: 'INITIAL_PURCHASE', app_user_id: user, product_id: 'plus_monthly', expiration_at_ms: 1_800_000_000_000 });
  assertEquals(e?.active, true);
  assertEquals(e?.expires, new Date(1_800_000_000_000).toISOString());
});

Deno.test('cancellation keeps access until expiry; expiration ends it', () => {
  assertEquals(toEntitlement({ type: 'CANCELLATION', app_user_id: user })?.active, true);
  assertEquals(toEntitlement({ type: 'EXPIRATION', app_user_id: user })?.active, false);
});

Deno.test('ignores anonymous ids and unknown events', () => {
  assertEquals(toEntitlement({ type: 'INITIAL_PURCHASE', app_user_id: '$RCAnonymousID:abc' }), null);
  assertEquals(toEntitlement({ type: 'TEST', app_user_id: user }), null);
});
