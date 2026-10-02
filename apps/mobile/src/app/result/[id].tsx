// F-05 Result (view once) / F-05a-b states / F-06 already viewed.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ResultView } from '@/components/poll/result-view';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { errorMessage, rpc } from '@/lib/api';
import { keys } from '@/lib/queries';
import type { Result } from '@/lib/types';

const VIEWED_AFTER_MS = 10_000;

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  // Fetched once: re-fetching after it's marked viewed would show "already viewed".
  const result = useQuery({
    queryKey: ['result', id],
    queryFn: () => rpc<Result>('get_result', { p_poll: id }),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const viewable = result.data && result.data.state !== 'already_viewed';

  useEffect(() => {
    if (!viewable) return;
    const mark = () => {
      rpc('mark_result_viewed', { p_poll: id }).catch(() => {});
      qc.invalidateQueries({ queryKey: keys.ready });
    };
    // Viewed = screen closed, or 10 seconds after opening (server also enforces this).
    const timer = setTimeout(mark, VIEWED_AFTER_MS);
    return () => {
      clearTimeout(timer);
      mark();
    };
  }, [viewable, id, qc]);

  if (result.isLoading) return <Screen><Text tone="muted">Loading…</Text></Screen>;
  if (result.error) {
    return (
      <Screen>
        <Banner tone="danger" message={errorMessage(result.error)} />
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const r = result.data!;
  if (r.state === 'already_viewed') {
    return (
      <Screen>
        <Text variant="title">You’ve already seen this result</Text>
        <Text variant="question">{r.question}</Text>
        <Text tone="muted">
          {r.you?.in_majority === true
            ? 'You picked the majority.'
            : r.you?.in_majority === false
              ? 'You were in the minority.'
              : 'Results are viewable once to keep polls temporary.'}
        </Text>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ResultView result={r} />
      <Button label="Done" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
