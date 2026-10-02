// Browse open polls by topic. Polls you can't vote on are shown with a way to add the topic.
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PollCard } from '@/components/poll/poll-card';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { PollCardSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { useCategories, useMe } from '@/lib/queries';
import type { PollOption } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

type BrowsePoll = { id: string; question: string; closes_at: string; is_taste: boolean; options: PollOption[]; can_vote: boolean };

export default function Browse() {
  const c = useColors();
  const { data: categories } = useCategories();
  const { data: me } = useMe();
  const open = (categories ?? []).filter((x) => !x.archived);
  const [picked, setPicked] = useState<number | null>(null);
  const category = open.find((x) => x.id === (picked ?? me?.category_ids[0])) ?? open[0];

  const polls = useQuery({
    queryKey: ['browse', category?.id],
    enabled: !!category,
    queryFn: () => rpc<BrowsePoll[]>('browse_polls', { p_category: category!.id }),
  });

  return (
    <Screen onRefresh={() => polls.refetch()}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
        {open.map((x) => (
          <Chip key={x.id} label={x.name} selected={x.id === category?.id} onPress={() => setPicked(x.id)} />
        ))}
      </ScrollView>
      {polls.isLoading ? (
        <PollCardSkeleton />
      ) : polls.isError ? (
        <ErrorState error={polls.error} onRetry={() => polls.refetch()} />
      ) : !polls.data?.length ? (
        <EmptyState title="Nothing open here right now" body="Check another topic, or ask your own question." />
      ) : (
        polls.data.map((p) =>
          p.can_vote ? (
            <PollCard
              key={p.id}
              poll={{ ...p, type: 'expert', target_label: category?.name ?? null, is_sensitive: !!category?.is_sensitive }}
            />
          ) : (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityHint={`Opens settings to add ${category?.name}`}
              onPress={() => router.push('/settings/categories')}
              style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space[4], gap: space[2], opacity: 0.8 }}>
              <Text variant="question">{p.question}</Text>
              <View>
                <Text variant="caption" tone="muted">
                  {me?.category_ids.includes(category?.id ?? -1)
                    ? 'This poll is for a different age group.'
                    : `Add ${category?.name} to your topics to vote on polls like this.`}
                </Text>
              </View>
            </Pressable>
          ),
        )
      )}
    </Screen>
  );
}
