'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Fail loudly in production builds with missing config; local dev falls back to the Supabase CLI stack.
if ((!url || !key) && process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set');
}

export const supabase = createClient(url || 'http://127.0.0.1:54321', key || 'missing-key');

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function imageUrl(path: string) {
  return supabase.storage.from('poll-images').createSignedUrl(path, 600).then((r) => r.data?.signedUrl ?? null);
}
