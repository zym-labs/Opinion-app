import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Error codes from STAGE4 §8. Database functions raise them as exception messages. */
export function fail(code: string, status = 400, message?: string) {
  return json({ error: { code, message: message ?? code } }, status);
}

const KNOWN = /^[A-Z_]{4,40}$/;

/** Maps a Postgres/PostgREST error raised by our functions to an API error response. */
export function fromDbError(error: { message?: string; code?: string } | null) {
  const msg = error?.message ?? '';
  if (KNOWN.test(msg)) {
    const status = msg === 'UNAUTHENTICATED' ? 401 : msg === 'ACCOUNT_SUSPENDED' ? 403 : msg === 'RATE_LIMITED' ? 429 : 400;
    return fail(msg, status);
  }
  console.error('db error', error);
  return fail('INTERNAL', 500);
}

export const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

/** Client that acts as the calling user (RLS and auth.uid() apply). */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

export async function getUserId(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

/** For worker functions invoked by pg_cron with the service role key. */
export function isServiceCall(req: Request) {
  return req.headers.get('Authorization') === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
