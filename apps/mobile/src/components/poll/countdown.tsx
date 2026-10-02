import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { radius, space, useColors } from '@/theme';

export function timeLeft(closesAt: string, now = Date.now()) {
  const ms = new Date(closesAt).getTime() - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${Math.max(m, 1)}m`;
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function CountdownPill({ closesAt }: { closesAt: string }) {
  const c = useColors();
  const now = useNow();
  const left = timeLeft(closesAt, now);
  const soon = new Date(closesAt).getTime() - now < 3_600_000;
  return (
    <View
      style={{
        paddingHorizontal: space[2],
        paddingVertical: 2,
        borderRadius: radius.full,
        backgroundColor: c.surfaceMuted,
      }}>
      <Text variant="caption" style={{ color: soon ? c.warning : c.textMuted, fontVariant: ['tabular-nums'] }}>
        {left ? `${left} left` : 'Closed'}
      </Text>
    </View>
  );
}
