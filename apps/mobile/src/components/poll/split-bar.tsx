// Two-colour split that springs from 50/50 to the real result (STAGE6 v2 §Reveal).
import { motion } from '@opinion/shared';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { radius, useColors } from '@/theme';

export function SplitBar({ pctA, animate = true, height = 16 }: { pctA: number; animate?: boolean; height?: number }) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const a = useSharedValue(animate ? 50 : pctA);

  useEffect(() => {
    if (!animate) {
      a.value = pctA;
      return;
    }
    const settle = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reduceMotion) {
      a.value = withTiming(pctA, { duration: 0 }, () => runOnJS(settle)());
    } else {
      a.value = withSpring(pctA, motion.reveal, (done) => {
        if (done) runOnJS(settle)();
      });
    }
  }, [pctA, animate, reduceMotion, a]);

  const left = useAnimatedStyle(() => ({ width: `${a.value}%` }));

  return (
    <View
      style={{ height, flexDirection: 'row', borderRadius: radius.full, overflow: 'hidden', backgroundColor: c.optionB }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      <Animated.View style={[{ height: '100%', backgroundColor: c.optionA }, left]} />
      {/* 2px gap keeps the two sides distinct without relying on colour alone */}
      <View style={{ width: 2, backgroundColor: c.bg }} />
    </View>
  );
}
