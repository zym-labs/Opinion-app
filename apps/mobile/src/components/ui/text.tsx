import { Text as RNText, type TextProps } from 'react-native';

import { type, useColors } from '@/theme';

type Variant = keyof typeof type;
type Tone = 'default' | 'muted' | 'faint' | 'danger';

export function Text({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const c = useColors();
  const color = { default: c.text, muted: c.textMuted, faint: c.textFaint, danger: c.danger }[tone];
  return <RNText style={[type[variant], { color }, style]} {...props} />;
}
