import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { radius, space, type, useColors } from '@/theme';

import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: PressableProps & { label: string; variant?: Variant; loading?: boolean }) {
  const c = useColors();
  const bg = { primary: c.primary, secondary: 'transparent', ghost: 'transparent', danger: c.danger }[variant];
  const fg = { primary: c.onPrimary, secondary: c.text, ghost: c.text, danger: '#FFFFFF' }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: radius.md,
        paddingHorizontal: space[5],
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: c.border,
        opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
      })}
      {...props}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[type.bodyStrong, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}
