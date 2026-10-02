// M-02 Active poll (live vote count only) / M-03 Completed (permanent result) / M-04 Share.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { CountdownPill } from '@/components/poll/countdown';
import { DecisionCard } from '@/components/poll/decision-card';
import { CreatorInsights } from '@/components/poll/insights';
import { ResultView } from '@/components/poll/result-view';
import { ShareCard, shareCard } from '@/components/poll/share-card';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { errorMessage, rpc } from '@/lib/api';
import { keys } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { MyPoll, Result } from '@/lib/types';

export default function MyPollScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<View>(null);
  const poll = useQuery({
    queryKey: ['my-poll', id],
    queryFn: async () => (await rpc<MyPoll[]>('get_my_poll', { p_poll: id }))[0] ?? null,
    // Until the poll is finished, re-check so the screen moves on when it closes and the summary lands.
    refetchInterval: (q) =>
      q.state.data && ['completed', 'failed_ai', 'removed'].includes(q.state.data.status) ? false : 30_000,
  });
  const p = poll.data;
  const finished = p && ['completed', 'failed_ai'].includes(p.status);
  const result = useQuery({
    queryKey: ['my-poll-result', id],
    enabled: !!finished,
    queryFn: () => rpc<Result>('get_my_poll_result', { p_poll: id }),
  });

  // Live vote count for the creator (STAGE4 §3.4).
  const [liveCount, setLiveCount] = useState<number | null>(null);
  useEffect(() => {
    if (p?.status !== 'active') return;
    const channel = supabase
      .channel(`poll:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'polls', filter: `id=eq.${id}` }, (payload) =>
        setLiveCount((payload.new as { vote_count: number }).vote_count),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, p?.status]);

  if (!p) {
    return (
      <Screen>
        {poll.isLoading ? (
          <ScreenSkeleton />
        ) : poll.isError ? (
          <ErrorState error={poll.error} onRetry={() => poll.refetch()} />
        ) : (
          <Text tone="muted">Poll not found.</Text>
        )}
      </Screen>
    );
  }

  function remove() {
    Alert.alert('Delete this poll?', 'Your poll credit will be refunded.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await rpc('delete_poll', { p_poll: id });
            qc.invalidateQueries({ queryKey: keys.myPolls(false) });
            qc.invalidateQueries({ queryKey: keys.credits });
            router.back();
          } catch (e) {
            setError(errorMessage(e));
          }
        },
      },
    ]);
  }

  if (p.status === 'removed') {
    return (
      <Screen>
        <Text variant="question">{p.question}</Text>
        <Banner tone="danger" message="This poll was removed for breaking the community guidelines." />
      </Screen>
    );
  }

  if (finished && result.data) {
    return (
      <Screen>
        <ResultView result={result.data} />
        <DecisionCard poll={p} options={result.data.options ?? []} />
        {result.data.state !== 'not_enough_responses' ? (
          <CreatorInsights pollId={id} options={result.data.options ?? []} />
        ) : null}
        {result.data.state !== 'not_enough_responses' ? (
          <>
            <Text variant="label" tone="muted">
              Share card preview
            </Text>
            <View style={{ alignItems: 'center' }}>
              <ShareCard ref={cardRef} result={result.data} />
            </View>
            <Button
              label="Share result"
              variant="secondary"
              onPress={() => (track('share_card', {}), shareCard(cardRef)).catch((e) => setError(e instanceof Error ? e.message : 'Could not share'))}
            />
          </>
        ) : null}
        <Button
          label="Ask a follow-up"
          variant="secondary"
          onPress={() => router.push({ pathname: '/create', params: { followUp: id } })}
        />
        {p.follow_up_count ? (
          <Text variant="caption" tone="faint">
            {p.follow_up_count} {p.follow_up_count === 1 ? 'follow-up' : 'follow-ups'} asked from this poll.
          </Text>
        ) : null}
      </Screen>
    );
  }

  const votes = liveCount ?? p.vote_count;
  return (
    <Screen>
      <Text variant="question">{p.question}</Text>
      {p.closes_at ? <CountdownPill closesAt={p.closes_at} /> : null}
      <Text variant="display" style={{ fontVariant: ['tabular-nums'] }}>
        {votes}
      </Text>
      <Text tone="muted">
        {votes === 1 ? 'vote so far' : 'votes so far'}. Results and the AI summary appear when the poll closes. Nobody,
        including you, sees how people voted until then.
      </Text>
      {p.status === 'summarizing' ? <Banner message="The poll has closed. The AI summary is being written." /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {p.status === 'active' && votes === 0 ? <Button label="Delete poll" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}
