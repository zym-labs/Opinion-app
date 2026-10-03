// Liquid Glass surface on iOS 26+, a plain tinted surface everywhere else (Android, web, older iOS).
// Use for floating chrome (header pill, prompts, summary cards), not for content that must stay legible.
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/theme';

const glass = isLiquidGlassAvailable();

export function Glass({ style, children, interactive }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; interactive?: boolean }) {
  const c = useColors();
  if (glass) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} style={style}>
        {children}
      </GlassView>
    );
  }
  return <View style={[{ backgroundColor: c.surfaceMuted }, style]}>{children}</View>;
}
