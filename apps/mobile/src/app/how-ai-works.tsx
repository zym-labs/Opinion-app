// "How this works" sheet for AI summaries (STAGE6 v2 §AI; HAX/PAIR: say what the AI does and why).
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { space } from '@/theme';

const POINTS: [string, string][] = [
  ['What it reads', 'Only the reasons voters wrote, after personal details like names, emails and links are removed. Never who wrote them.'],
  ['What it writes', 'One summary for the side most people picked and one for the other side. Both get the same space, so the minority view is never squeezed out.'],
  ['How it stays honest', 'Every point must come from at least one real reason, and a second AI check looks for anything left out or unfair before you see it.'],
  ['Featured quotes', 'Up to three reasons, copied word for word, from voters who agreed to be quoted anonymously. At least one comes from the minority when there is one.'],
  ['What it can’t do', 'It can be wrong or miss nuance, especially when only a few people explained their vote. Results are opinions, not professional advice.'],
];

export default function HowAiWorks() {
  return (
    <Screen>
      <Text variant="title">How AI summaries work</Text>
      <View style={{ gap: space[5] }}>
        {POINTS.map(([title, body]) => (
          <View key={title} style={{ gap: space[1] }}>
            <Text variant="bodyStrong">{title}</Text>
            <Text tone="muted">{body}</Text>
          </View>
        ))}
      </View>
      <Text variant="caption" tone="faint">
        If a summary looks wrong or unfair, use “Report summary” and a person will review it.
      </Text>
      <Button label="Got it" onPress={() => router.back()} />
    </Screen>
  );
}
