// M-01 My Polls: Active · Completed.
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { HeaderBar } from '@/components/header-bar';
import { timeLeft } from '@/components/poll/countdown';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { keys } from '@/lib/queries';
import type { MyPoll } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

const PAGE = 30;

const STATUS: Record<MyPoll['status'], string> = {
  draft: 'Draft',
  active: 'Live',
  closing: 'Closing',
  summarizing: 'Writing summary',
  completed: 'Completed',
  failed_ai: 'Completed (no summary)',
  removed: 'Removed',
};

export default function MyPolls() {
  const c = useColors();
  const [completed, setCompleted] = useState(false);
  const q = useInfiniteQuery({
    queryKey: keys.myPolls(completed),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      rpc<MyPoll[]>('get_my_polls', { p_completed: completed, p_before: pageParam, p_limit: PAGE }),
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].created_at : undefined),
  });
  const polls = { data: q.data?.pages.flat(), isLoading: q.isLoading };

  return (
    <Screen>
      <HeaderBar title="My Polls" />
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <Chip label="Active" selected={!completed} onPress={() => setCompleted(false)} />
        <Chip label="Completed" selected={completed} onPress={() => setCompleted(true)} />
      </View>
      {polls.data?.length ? (
        polls.data.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/my-poll/[id]', params: { id: p.id } })}
            style={{
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.border,
              padding: space[4],
              gap: space[1],
            }}>
            <Text variant="bodyStrong">{p.question}</Text>
            <Text variant="label" tone="muted">
              {STATUS[p.status]} · {p.vote_count} votes
              {p.status === 'active' && p.closes_at ? ` · ${timeLeft(p.closes_at) ?? 'closing'} left` : ''}
            </Text>
          </Pressable>
        ))
      ) : polls.isLoading ? (
        <ScreenSkeleton />
      ) : (
        <View style={{ flex: 1, gap: space[3] }}>
          <EmptyState
            title={completed ? 'No completed polls yet' : 'No active polls'}
            body="Polls you create are kept here with their results."
          />
          <Button label="Create a poll" onPress={() => router.navigate('/create')} />
        </View>
      )}
      {q.hasNextPage ? (
        <Button label="Show more" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />
      ) : null}
    </Screen>
  );
}
