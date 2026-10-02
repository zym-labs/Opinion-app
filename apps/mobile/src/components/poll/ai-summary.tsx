// AI summary (STAGE6 v2 §AI): specific label, equal-weight majority/minority cards,
// low-evidence state, "How this works" and a report action.
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Result, Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

import { SideBadge, useSideColors } from './option-tile';

const FEW_REASONS = 5;

function SideCard({ side, title, label, body, pct }: {
  side: Side;
  title: string;
  label: string;
  body: string;
  pct: number | null;
}) {
  const c = useColors();
  const s = useSideColors(side);
  return (
    <View
      accessible
      accessibilityLabel={`${title}, option ${side.toUpperCase()}, ${label}${pct != null ? `, ${pct.toFixed(0)} percent` : ''}. ${body}`}
      style={{
        backgroundColor: c.surfaceMuted,
        borderRadius: radius.lg,
        borderLeftWidth: 4,
        borderLeftColor: s.strong,
        padding: space[4],
        gap: space[2],
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <SideBadge side={side} />
        <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
          {title} · {label}
        </Text>
        {pct != null ? (
          <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {pct.toFixed(0)}%
          </Text>
        ) : null}
      </View>
      <Text>{body}</Text>
    </View>
  );
}

export function AISummary({ result }: { result: Result }) {
  const c = useColors();
  const count = result.reason_count ?? 0;

  if (result.state === 'summary_pending') {
    return (
      <View style={{ backgroundColor: c.surfaceMuted, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
        <Header count={count} />
        <Text tone="muted">The AI is reading {count} reasons. Check back in a minute.</Text>
      </View>
    );
  }
  if (result.state === 'summary_failed' || !result.summary?.majority) {
    return count > 0 ? (
      <Text variant="label" tone="muted">
        No AI summary for this poll. The featured reasons below are voters’ own words.
      </Text>
    ) : null;
  }

  const s = result.summary;
  const winner: Side = result.winner ?? 'a';
  const loser: Side = winner === 'a' ? 'b' : 'a';
  const opt = (side: Side) => result.options?.find((o) => o.side === side);
  const label = (side: Side) => opt(side)?.label ?? `Option ${side.toUpperCase()}`;
  const pct = (side: Side) => (opt(side)?.pct != null ? Number(opt(side)!.pct) : null);

  return (
    <View style={{ gap: space[3] }}>
      <Header count={count} />
      {count < FEW_REASONS ? (
        <Text variant="label" style={{ color: c.warning }}>
          Only a few reasons were given, so this summary may not reflect everyone.
        </Text>
      ) : null}
      <SideCard side={winner} title="Most said" label={label(winner)} body={s.majority!} pct={pct(winner)} />
      <SideCard
        side={loser}
        title="Others said"
        label={label(loser)}
        body={s.minority ?? 'Too few people explained this side to summarise it fairly.'}
        pct={pct(loser)}
      />
      {s.disclaimer ? (
        <Text variant="caption" tone="faint">
          {s.disclaimer}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space[4] }}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/how-ai-works')}>
          <Text variant="label" style={{ color: c.ai }}>
            How this works
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() =>
            router.push({ pathname: '/report', params: { target: 'poll', id: result.poll_id, summary: '1' } })
          }>
          <Text variant="label" tone="faint">
            Report summary
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Header({ count }: { count: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
      <Sparkles size={16} strokeWidth={1.75} color={c.ai} />
      <Text variant="label" style={{ color: c.ai }}>
        Written by AI from {count} {count === 1 ? 'voter’s reason' : 'voters’ reasons'}
      </Text>
    </View>
  );
}
