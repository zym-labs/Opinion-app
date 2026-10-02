// P-02 Your featured insights.
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { radius, space, useColors } from '@/theme';

export default function Featured() {
  const c = useColors();
  const q = useQuery({
    queryKey: ['featured'],
    queryFn: () => rpc<{ quote: string; question: string; featured_at: string; helpful: number }[]>('my_featured_insights'),
  });
  if (!q.isLoading && !q.data?.length) {
    return (
      <Screen>
        <EmptyState title="Nothing featured yet" body="When the AI picks your reason as a featured insight, it shows up here." />
      </Screen>
    );
  }
  return (
    <Screen>
      {q.data?.map((f, i) => (
        <View key={i} style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
          <Text variant="quote">“{f.quote}”</Text>
          <Text variant="label" tone="muted">
            On “{f.question}”
          </Text>
          {f.helpful ? (
            <Text variant="caption" tone="faint">
              {f.helpful} {f.helpful === 1 ? 'person' : 'people'} found this helpful
            </Text>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}
