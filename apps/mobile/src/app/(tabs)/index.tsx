// F-01 Feed: results ready first, then open polls (STAGE1 §3).
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { HeaderBar } from '@/components/header-bar';
import { timeLeft } from '@/components/poll/countdown';
import { PollCard } from '@/components/poll/poll-card';
import { PollCardSkeleton } from '@/components/ui/skeleton';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useWasAway } from '@/lib/activity';
import { useOffline } from '@/lib/offline';
import { useDaily, useFeed, useResultsReady, useUnreadCount, useWaiting } from '@/lib/queries';
import { updateDailyWidget } from '@/lib/widgets';
import { radius, space, useColors } from '@/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space[3] }}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ title, detail, onPress, highlight }: {
  title: string;
  detail: string;
  onPress?: () => void;
  highlight?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={{
        backgroundColor: highlight ? c.optionASoft : c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: highlight ? c.optionA : c.border,
        padding: space[4],
        gap: space[1],
      }}>
      <Text variant="bodyStrong" numberOfLines={2}>
        {title}
      </Text>
      <Text variant="label" tone="muted">
        {detail}
      </Text>
    </Pressable>
  );
}

export default function Feed() {
  const c = useColors();
  const qc = useQueryClient();
  const feed = useFeed();
  const ready = useResultsReady();
  const waiting = useWaiting();
  const offline = useOffline();
  const daily = useDaily();
  const away = useWasAway();
  const { data: unread = 0 } = useUnreadCount();
  const [awayDismissed, setAwayDismissed] = useState(false);
  useEffect(() => {
    if (daily.isSuccess) updateDailyWidget(daily.data);
  }, [daily.isSuccess, daily.data]);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  }

  const polls = feed.data?.pages.flat() ?? [];
  const empty = !polls.length && !ready.data?.length && !waiting.data?.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: space[4], gap: space[6], flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        scrollEventThrottle={200}
        onScroll={({ nativeEvent: e }) => {
          // Load the next page when within one screen of the end.
          const nearEnd = e.contentOffset.y + e.layoutMeasurement.height * 2 >= e.contentSize.height;
          if (nearEnd && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}>
        <HeaderBar title="Feed" />
        {offline ? <Banner tone="warning" message="You’re offline. Showing your last feed; voting is paused." /> : null}

        {away && !awayDismissed && ((ready.data?.length ?? 0) > 0 || unread > 0) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Dismisses this summary"
            onPress={() => setAwayDismissed(true)}
            style={{ backgroundColor: c.surfaceMuted, borderRadius: radius.lg, padding: space[4], gap: space[1] }}>
            <Text variant="bodyStrong">While you were away</Text>
            <Text tone="muted">
              {[
                ready.data?.length ? `${ready.data.length} ${ready.data.length === 1 ? 'result is' : 'results are'} ready below` : null,
                unread ? `${unread} new ${unread === 1 ? 'notification' : 'notifications'}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Pressable>
        ) : null}

        {daily.data ? (
          daily.data.voted ? (
            <Row
              title={daily.data.question}
              detail={`Today’s question · you’ve answered · results in ${timeLeft(daily.data.closes_at) ?? 'a moment'}`}
            />
          ) : (
            <Section title="Today’s question">
              <PollCard
                poll={{
                  id: daily.data.id,
                  type: 'expert',
                  is_taste: true,
                  question: daily.data.question,
                  closes_at: daily.data.closes_at,
                  target_label: 'Everyone',
                  is_sensitive: false,
                  options: daily.data.options,
                }}
              />
            </Section>
          )
        ) : null}

        {ready.data?.length ? (
          <Section title="Results ready">
            {ready.data.map((r) => (
              <Row
                key={r.id}
                highlight
                title={r.question}
                detail="Tap to see the result. You can view it once."
                onPress={() => router.push({ pathname: '/result/[id]', params: { id: r.id } })}
              />
            ))}
          </Section>
        ) : null}

        {polls.length ? (
          <Section title="Open polls">
            {polls.map((p) => (
              <PollCard key={p.id} poll={p} />
            ))}
            {feed.isFetchingNextPage ? <PollCardSkeleton /> : null}
          </Section>
        ) : null}

        {waiting.data?.length ? (
          <Section title="Waiting for results">
            {waiting.data.map((w) => (
              <Row
                key={w.id}
                title={w.question}
                detail={`You picked ${w.my_side.toUpperCase()} · ${timeLeft(w.closes_at) ? `results in ${timeLeft(w.closes_at)}` : 'results being prepared'}`}
              />
            ))}
          </Section>
        ) : null}

        {feed.isError && !polls.length ? <ErrorState error={feed.error} onRetry={() => feed.refetch()} /> : null}
        {empty && !feed.isLoading && !feed.isError ? (
          <View style={{ flex: 1, gap: space[3] }}>
            <EmptyState
              title="No open polls for your interests"
              body="Join more communities or add categories to see more polls — or ask your own question."
            />
            <Button label="Browse other topics" variant="secondary" onPress={() => router.push('/browse')} />
            <Button label="Manage communities" variant="secondary" onPress={() => router.push('/settings/communities')} />
            <Button label="Create a poll" variant="ghost" onPress={() => router.push('/create')} />
          </View>
        ) : null}
        {!empty && !feed.isLoading && !feed.hasNextPage ? (
          <Button label="Browse other topics" variant="ghost" onPress={() => router.push('/browse')} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
