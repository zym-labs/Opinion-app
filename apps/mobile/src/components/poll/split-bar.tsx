// Result bar with one segment per option. It springs from equal shares (a contest that resolves)
// to the real split (STAGE6 v2 §Reveal).
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
  type SharedValue,
} from 'react-native-reanimated';

import type { Side } from '@/lib/types';
import { radius, useColors } from '@/theme';

import { sideColors } from './option-tile';

type Segment = { side: Side; pct: number };

function Seg({ progress, from, to, color }: { progress: SharedValue<number>; from: number; to: number; color: string }) {
  const style = useAnimatedStyle(() => ({ flexGrow: Math.max(from + (to - from) * progress.value, 0.001) }));
  return <Animated.View style={[{ height: '100%', flexBasis: 0, backgroundColor: color }, style]} />;
}

export function SplitBar({
  segments,
  animate = true,
  haptic = false,
  height = 16,
}: {
  segments: Segment[];
  animate?: boolean;
  /** Only the reveal story vibrates when the bar settles (STAGE6 v2 haptic map). */
  haptic?: boolean;
  height?: number;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(animate ? 0 : 1);
  const equal = 100 / Math.max(segments.length, 1);
  const key = segments.map((s) => `${s.side}:${s.pct}`).join('|');

  useEffect(() => {
    if (!animate) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    const settle = () => {
      if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };
    progress.value = reduceMotion
      ? withTiming(1, { duration: 0 }, () => runOnJS(settle)())
      : withSpring(1, motion.reveal, (done) => {
          if (done) runOnJS(settle)();
        });
  }, [key, animate, haptic, reduceMotion, progress]);

  return (
    <View
      style={{ height, flexDirection: 'row', gap: 2, borderRadius: radius.full, overflow: 'hidden' }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      {segments.map((s) => (
        <Seg key={s.side} progress={progress} from={equal} to={s.pct} color={sideColors(c, s.side).strong} />
      ))}
    </View>
  );
}

/** Segments from a result's options. */
export const segmentsOf = (options: { side: Side; pct: number | null }[] | undefined): Segment[] =>
  (options ?? []).map((o) => ({ side: o.side, pct: Number(o.pct ?? 0) }));
