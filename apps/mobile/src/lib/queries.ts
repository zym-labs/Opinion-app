import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { rpc } from './api';
import { useSession } from './session';
import { supabase } from './supabase';
import type { Category, Community, Credits, FeedPoll, Me, ReadyResult, Stats, WaitingPoll } from './types';

export const keys = {
  me: ['me'],
  categories: ['categories'],
  communities: ['communities'],
  feed: ['feed'],
  waiting: ['waiting'],
  ready: ['ready'],
  credits: ['credits'],
  myPolls: (completed: boolean) => ['my-polls', completed],
  stats: ['stats'],
  notifications: ['notifications'],
};

export function useMe() {
  const { session } = useSession();
  return useQuery({
    queryKey: keys.me,
    enabled: !!session,
    queryFn: async () => (await rpc<Me[]>('get_me'))[0] ?? null,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort');
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCommunities() {
  return useQuery({
    queryKey: keys.communities,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('communities').select('*').order('name');
      if (error) throw error;
      return data as Community[];
    },
  });
}

const FEED_PAGE = 20;

/** Feed pages: polls short of votes first, then soonest closing; the cursor is the last poll's sort key. */
export const useFeed = () =>
  useInfiniteQuery({
    queryKey: keys.feed,
    initialPageParam: null as FeedPoll | null,
    queryFn: ({ pageParam }) =>
      rpc<FeedPoll[]>('get_feed', {
        p_limit: FEED_PAGE,
        p_after_closes: pageParam?.closes_at ?? null,
        p_after_id: pageParam?.id ?? null,
        p_after_bucket: pageParam?.bucket ?? null,
      }),
    getNextPageParam: (last) => (last.length === FEED_PAGE ? last[last.length - 1] : undefined),
  });
export const useWaiting = () => useQuery({ queryKey: keys.waiting, queryFn: () => rpc<WaitingPoll[]>('get_waiting') });
export const useResultsReady = () =>
  useQuery({ queryKey: keys.ready, queryFn: () => rpc<ReadyResult[]>('get_results_ready') });
export const useCredits = () =>
  useQuery({ queryKey: keys.credits, queryFn: async () => (await rpc<Credits[]>('get_credits'))[0] });
export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: () => rpc<Stats>('my_stats') });
