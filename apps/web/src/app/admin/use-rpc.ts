'use client';

import { useCallback, useEffect, useState } from 'react';

import { rpc } from '@/lib/supabase';

/** Loads an admin RPC and exposes a reload function. */
export function useRpc<T>(fn: string, args?: Record<string, unknown>) {
  const key = JSON.stringify(args ?? {});
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await rpc<T>(fn, JSON.parse(key)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [fn, key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
