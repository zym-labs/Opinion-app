import { t, tMaybe } from './i18n';
import { integrityHeaders } from './integrity';
import { supabase } from './supabase';

/** API error with a code from STAGE4 §8. */
export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? (tMaybe(`error.${e.code}`) ?? e.message) : t('error.generic');

function toApiError(error: { message?: string } | null): ApiError {
  const msg = error?.message ?? 'INTERNAL';
  return new ApiError(/^[A-Z_]{4,40}$/.test(msg) ? msg : 'INTERNAL', msg);
}

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toApiError(error);
  return data as T;
}

export async function callFunction<T>(
  name: string,
  body?: Record<string, unknown>,
  opts: { method?: 'POST' | 'DELETE'; idempotencyKey?: string; signed?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  // Signed requests send the exact JSON string the integrity token covers.
  let payload: Record<string, unknown> | string | undefined = body;
  if (opts.signed && body) {
    payload = JSON.stringify(body);
    // Local session, no network round trip (the server verifies the token anyway).
    const { data: auth } = await supabase.auth.getSession();
    headers['Content-Type'] = 'application/json';
    if (auth.session) Object.assign(headers, await integrityHeaders(auth.session.user.id, payload));
  }
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
    method: opts.method ?? 'POST',
    headers,
  });
  if (error) {
    const payload = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new ApiError(payload?.error?.code ?? 'INTERNAL', payload?.error?.message);
  }
  return data as T;
}

export function imageUrl(path: string) {
  return supabase.storage.from('poll-images').createSignedUrl(path, 3600).then((r) => r.data?.signedUrl ?? null);
}
