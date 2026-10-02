// Skeleton placeholders (STAGE6 §7). A gentle opacity pulse; static under Reduce Motion.
import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius, space, useColors } from '@/theme';

export function SkeletonBlock({ width = '100%', height = 16, round = radius.sm }: { width?: DimensionValue; height?: number; round?: number }) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) opacity.value = withRepeat(withTiming(0.5, { duration: 700 }), -1, true);
  }, [reduceMotion, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: round, backgroundColor: c.surfaceMuted }, style]} />;
}

/** Shape of a feed PollCard while loading. */
export function PollCardSkeleton() {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel="Loading poll"
      style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space[4], gap: space[3] }}>
      <SkeletonBlock width="40%" height={12} />
      <SkeletonBlock width="90%" height={22} />
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={64} round={radius.md} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={64} round={radius.md} />
        </View>
      </View>
    </View>
  );
}

/** Generic screen placeholder: a title and a few lines. */
export function ScreenSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <View accessible accessibilityLabel="Loading" style={{ gap: space[3] }}>
      <SkeletonBlock width="60%" height={28} />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBlock key={i} width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </View>
  );
}
