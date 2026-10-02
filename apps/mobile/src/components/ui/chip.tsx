import { Pressable } from 'react-native';

import { radius, space, useColors } from '@/theme';

import { Text } from './text';

export function Chip({ label, selected, onPress, disabled }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: space[4],
        justifyContent: 'center',
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.primary : c.surface,
        opacity: disabled && !selected ? 0.4 : 1,
      }}>
      <Text variant="label" style={{ color: selected ? c.onPrimary : c.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
