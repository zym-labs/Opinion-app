import { View } from 'react-native';

import { space } from '@/theme';

import { Text } from './ui/text';

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: space[2], paddingVertical: space[16] }}>
      <Text variant="question" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text tone="muted" style={{ textAlign: 'center' }}>
        {body}
      </Text>
    </View>
  );
}
