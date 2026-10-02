// Screenshot / demo mode with sample data (store screenshots, design review).
// Only available in development builds or when EXPO_PUBLIC_DEMO=1; production builds redirect away.
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PollCard } from '@/components/poll/poll-card';
import { ResultStory } from '@/components/poll/result-story';
import { ResultView } from '@/components/poll/result-view';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { DEMO_FEED, DEMO_RESULT } from '@/lib/demo-data';
import { space } from '@/theme';

const ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DEMO === '1';
type View_ = 'feed' | 'story' | 'result';

export default function Demo() {
  const [view, setView] = useState<View_>('feed');
  if (!ENABLED) return <Redirect href="/" />;

  if (view === 'story') {
    return <ResultStory result={DEMO_RESULT} onFinish={() => setView('feed')} />;
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        <Chip label="Feed" selected={view === 'feed'} onPress={() => setView('feed')} />
        <Chip label="Reveal story" selected={false} onPress={() => setView('story')} />
        <Chip label="Creator result" selected={view === 'result'} onPress={() => setView('result')} />
        <Chip label="Exit" selected={false} onPress={() => router.back()} />
      </View>
      {view === 'feed' ? (
        <>
          <Text variant="title">Feed</Text>
          <Text variant="label" tone="muted">
            Open polls
          </Text>
          {DEMO_FEED.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))}
        </>
      ) : (
        <ResultView result={{ ...DEMO_RESULT, view_once: false, you: null }} />
      )}
    </Screen>
  );
}
