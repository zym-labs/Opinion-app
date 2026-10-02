// M-02 Active poll (live vote count only) / M-03 Completed (permanent result) / M-04 Share.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { CountdownPill } from '@/components/poll/countdown';
import { ResultView } from '@/components/poll/result-view';
import { ShareCard, shareCard } from '@/components/poll/share-card';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
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
    queryFn: async () => {
      const [active, done] = await Promise.all([
        rpc<MyPoll[]>('get_my_polls', { p_completed: false }),
        rpc<MyPoll[]>('get_my_polls', { p_completed: true }),
      ]);
      return [...active, ...done].find((p) => p.id === id) ?? null;
    },
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

  if (!p) return <Screen><Text tone="muted">{poll.isLoading ? 'Loading…' : 'Poll not found.'}</Text></Screen>;

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
              onPress={() => shareCard(cardRef).catch((e) => setError(e instanceof Error ? e.message : 'Could not share'))}
            />
          </>
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
