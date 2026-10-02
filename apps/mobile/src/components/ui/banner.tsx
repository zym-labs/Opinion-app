import { View } from 'react-native';

import { radius, space, useColors } from '@/theme';

import { Text } from './text';

type Tone = 'info' | 'warning' | 'danger' | 'privacy';

export function Banner({ message, tone = 'info' }: { message: string; tone?: Tone }) {
  const c = useColors();
  const accent = { info: c.focus, warning: c.warning, danger: c.danger, privacy: c.textMuted }[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={{
        backgroundColor: c.surfaceMuted,
        borderRadius: radius.sm,
        borderLeftWidth: 3,
        borderLeftColor: accent,
        padding: space[3],
      }}>
      <Text variant="label">{message}</Text>
    </View>
  );
}
