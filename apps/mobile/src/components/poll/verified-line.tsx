// "Verified experts (6): A 83% · B 17%" — aggregate only, shown when at least 10 verified experts voted.
import { BadgeCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Result, Side } from '@/lib/types';
import { space, useColors } from '@/theme';

export function verifiedText(r: Result) {
  if (!r.verified) return null;
  const parts = (r.options ?? []).map((o) => `${o.side.toUpperCase()} ${Math.round(r.verified!.pcts[o.side as Side] ?? 0)}%`);
  return `Verified experts (${r.verified.total}): ${parts.join(' · ')}`;
}

export function VerifiedLine({ result }: { result: Result }) {
  const c = useColors();
  const text = verifiedText(result);
  if (!text) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }} accessible accessibilityLabel={text}>
      <BadgeCheck size={16} strokeWidth={1.75} color={c.success} />
      <Text variant="label" tone="muted">
        {text}
      </Text>
    </View>
  );
}
