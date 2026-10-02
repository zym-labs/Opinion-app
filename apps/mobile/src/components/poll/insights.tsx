// Creator insights (private): verified vs self-selected split, how well voters predicted, and how
// many explained their vote. Groups under 10 votes are hidden by the server.
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import type { PollOption, Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

type Insights = {
  total: number;
  min_group: number;
  with_reason_pct: number | null;
  quote_consent_pct: number | null;
  verified: Partial<Record<Side, number>> | null;
  self_selected: Partial<Record<Side, number>> | null;
  predictions: { made: number; right_pct: number | null; expected: Partial<Record<Side, number>> } | null;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3] }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="label" tone="muted" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

export function CreatorInsights({ pollId, options }: { pollId: string; options: PollOption[] }) {
  const c = useColors();
  const q = useQuery({ queryKey: ['insights', pollId], queryFn: () => rpc<Insights>('get_poll_insights', { p_poll: pollId }) });
  const d = q.data;
  if (!d) return null;
  const split = (p: Partial<Record<Side, number>>) =>
    options.map((o) => `${o.side.toUpperCase()} ${Math.round(p[o.side] ?? 0)}%`).join(' · ');
  const hidden = `fewer than ${d.min_group}`;

  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Lock size={14} strokeWidth={1.75} color={c.textMuted} />
        <Text variant="label" tone="muted">
          Insights · only you can see these
        </Text>
      </View>
      <Row label="Verified experts" value={d.verified ? split(d.verified) : hidden} />
      <Row label="Self-selected voters" value={d.self_selected ? split(d.self_selected) : hidden} />
      {d.predictions ? (
        <>
          <Row label="Voters who predicted the winner" value={d.predictions.right_pct != null ? `${d.predictions.right_pct}%` : 'tie'} />
          <Row label="What voters expected" value={split(d.predictions.expected)} />
        </>
      ) : (
        <Row label="Predictions" value={hidden} />
      )}
      <Row label="Explained their vote" value={d.with_reason_pct != null ? `${d.with_reason_pct}%` : hidden} />
      <Row label="Agreed to be quoted" value={d.quote_consent_pct != null ? `${d.quote_consent_pct}%` : hidden} />
      <Text variant="caption" tone="faint">
        Groups with fewer than {d.min_group} votes are hidden so no one can be identified.
      </Text>
    </View>
  );
}
