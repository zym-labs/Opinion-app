import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { radius, space, useColors } from '@/theme';

export function StepHeader({ step, total, title, body }: { step: number; total: number; title: string; body?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: space[3] }}>
      <View
        style={{ flexDirection: 'row', gap: space[1] }}
        accessible
        accessibilityLabel={`Step ${step} of ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 4, borderRadius: radius.full, backgroundColor: i < step ? c.text : c.border }}
          />
        ))}
      </View>
      <Text variant="title">{title}</Text>
      {body ? <Text tone="muted">{body}</Text> : null}
    </View>
  );
}
