import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';

Deno.env.set('APPLE_TOKEN_KEY', btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))));
const { decrypt, encrypt } = await import('./apple.ts');

Deno.test('Apple refresh tokens are encrypted and decrypt back', async () => {
  const token = 'r1.abc-def_ghi';
  const enc = await encrypt(token);
  assertNotEquals(enc, token);
  assertNotEquals(await encrypt(token), enc); // random IV per encryption
  assertEquals(await decrypt(enc), token);
});
