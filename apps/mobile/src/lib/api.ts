import { integrityHeaders } from './integrity';
import { supabase } from './supabase';

/** API error with a code from STAGE4 §8. */
export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

const MESSAGES: Record<string, string> = {
  AGE_BLOCKED: 'Opinion is for people 18 and over.',
  RATE_LIMITED: 'You’re doing that too often. Try again later.',
  CATEGORY_LIMIT: 'Choose between 1 and 5 categories.',
  CATEGORY_COOLDOWN: 'You can change your categories once every 7 days.',
  CAMPUS_VERIFICATION_REQUIRED: 'Verify your campus email to join.',
  DOMAIN_NOT_ALLOWED: 'That email isn’t from this campus.',
  EMAIL_ALREADY_USED: 'That email is already verified on another account.',
  CODE_INVALID: 'That code is wrong or has expired.',
  POLL_NOT_FOUND: 'This poll is no longer available.',
  POLL_CLOSED: 'This poll just closed.',
  NOT_ELIGIBLE: 'This poll isn’t open to you.',
  ALREADY_VOTED: 'You’ve already voted on this poll.',
  CANNOT_VOTE_OWN_POLL: 'You can’t vote on your own poll.',
  REASON_TOO_SHORT: 'Your reason needs at least 20 characters.',
  REASON_TOO_LONG: 'Your reason can be at most 200 characters.',
  REASON_REJECTED: 'Please rephrase — this reason can’t be accepted.',
  CONSENT_REQUIRED: 'Please confirm the featuring consent.',
  CONTENT_REJECTED: 'This content can’t be posted. Please change it.',
  IMAGE_PENDING: 'Your images are still being checked. Try again in a moment.',
  AUDIENCE_TOO_SMALL: 'Fewer than 20 people match. Widen your audience.',
  INSUFFICIENT_CREDITS: 'Vote on more polls to post your own.',
  POLL_HAS_VOTES: 'Polls can only be deleted before the first vote.',
  RESULT_NOT_READY: 'Results aren’t ready yet.',
  ACCOUNT_SUSPENDED: 'Your account is suspended.',
};

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? MESSAGES[e.code] ?? e.message : 'Something went wrong. Please try again.';

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
    const { data: auth } = await supabase.auth.getUser();
    headers['Content-Type'] = 'application/json';
    if (auth.user) Object.assign(headers, await integrityHeaders(auth.user.id, payload));
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
