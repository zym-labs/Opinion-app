// A failed load with a way out. Offline users see the offline wording instead of the raw error.
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorMessage } from '@/lib/api';
import { useOffline } from '@/lib/offline';
import { space } from '@/theme';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => unknown }) {
  const offline = useOffline();
  return (
    <View accessibilityRole="alert" style={{ flex: 1, justifyContent: 'center', gap: space[3], paddingVertical: space[16] }}>
      <Text variant="question" style={{ textAlign: 'center' }}>
        {offline ? 'You’re offline' : 'Couldn’t load this'}
      </Text>
      <Text tone="muted" style={{ textAlign: 'center' }}>
        {offline ? 'Check your connection and try again.' : errorMessage(error)}
      </Text>
      <Button label="Try again" variant="secondary" onPress={() => onRetry()} />
    </View>
  );
}
