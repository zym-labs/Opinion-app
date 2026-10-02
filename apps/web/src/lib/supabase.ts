'use client';

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'missing-key',
);

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function imageUrl(path: string) {
  return supabase.storage.from('poll-images').createSignedUrl(path, 600).then((r) => r.data?.signedUrl ?? null);
}
