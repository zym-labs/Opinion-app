// Explains vote-to-ask credits (SPEC: Polls).
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useCredits } from '@/lib/queries';

export default function Credits() {
  const { data } = useCredits();
  const progress = (data?.units ?? 0) % 3;
  return (
    <Screen>
      <Text variant="display">{data?.polls_available ?? 0}</Text>
      <Text variant="question">{data?.polls_available === 1 ? 'poll you can post' : 'polls you can post'}</Text>
      <Text tone="muted">Every 3 votes you give earns 1 poll. You’re {progress}/3 of the way to the next one.</Text>
      <Text tone="muted">New accounts start with one free poll. Credits from votes count once your account is a day old.</Text>
      <Button label="Got it" onPress={() => router.back()} />
    </Screen>
  );
}
