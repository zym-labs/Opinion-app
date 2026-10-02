// F-01 Feed: results ready first, then open polls (STAGE1 §3).
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { HeaderBar } from '@/components/header-bar';
import { timeLeft } from '@/components/poll/countdown';
import { PollCard } from '@/components/poll/poll-card';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useOffline } from '@/lib/offline';
import { useFeed, useResultsReady, useWaiting } from '@/lib/queries';
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
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  }

  const empty = !feed.data?.length && !ready.data?.length && !waiting.data?.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: space[4], gap: space[6], flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <HeaderBar title="Feed" />
        {offline ? <Banner tone="warning" message="You’re offline. Showing your last feed; voting is paused." /> : null}

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

        {feed.data?.length ? (
          <Section title="Open polls">
            {feed.data.map((p) => (
              <PollCard key={p.id} poll={p} />
            ))}
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

        {empty && !feed.isLoading ? (
          <View style={{ flex: 1, gap: space[3] }}>
            <EmptyState
              title="No open polls for your interests"
              body="Join more communities or add categories to see more polls — or ask your own question."
            />
            <Button label="Manage communities" variant="secondary" onPress={() => router.push('/settings/communities')} />
            <Button label="Create a poll" variant="ghost" onPress={() => router.push('/create')} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
