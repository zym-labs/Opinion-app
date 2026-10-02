// F-05 Result as a once-only story / F-05a not enough responses / F-06 already viewed.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { ResultStory } from '@/components/poll/result-story';
import { ResultView } from '@/components/poll/result-view';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { errorMessage, rpc } from '@/lib/api';
import { keys } from '@/lib/queries';
import type { Result } from '@/lib/types';

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
  const viewable = !!result.data && result.data.state !== 'already_viewed';
  const marked = useRef(false);

  // Viewed = the user leaves the result (last card, Done, or back). The server marks it
  // anyway 5 minutes after opening in case the app is closed mid-story.
  useEffect(() => {
    if (!viewable) return;
    return () => {
      if (marked.current) return;
      marked.current = true;
      rpc('mark_result_viewed', { p_poll: id }).catch(() => {});
      qc.invalidateQueries({ queryKey: keys.ready });
    };
  }, [viewable, id, qc]);

  if (result.isLoading) return <Screen><ScreenSkeleton /></Screen>;
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

  if (r.state === 'not_enough_responses') {
    return (
      <Screen>
        <ResultView result={r} />
        <Button label="Done" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <ResultStory result={r} onFinish={() => router.back()} />
    </>
  );
}
