// AI summary (STAGE6 v2 §AI): specific label, equal-weight majority/minority cards,
// low-evidence state, "How this works" and a report action.
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { rpc } from '@/lib/api';
import type { Result, Side, SummaryPoint } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

import { SideBadge, useSideColors } from './option-tile';

const FEW_REASONS = 5;

/** A summary point with its evidence: "N reasons" and tappable quote chips that show the voter's words. */
function PointRow({ point, quotes }: { point: SummaryPoint; quotes: Map<string, { n: number; quote: string }> }) {
  const c = useColors();
  const [open, setOpen] = useState<string | null>(null);
  const linked = point.quote_ids.filter((id) => quotes.has(id));
  return (
    <View style={{ gap: space[2] }}>
      <Text>• {point.text}</Text>
      {point.reason_count > 0 || linked.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingLeft: space[3] }}>
          {point.reason_count > 0 ? (
            <Text variant="caption" tone="faint" style={{ paddingVertical: space[1] }}>
              From {point.reason_count} {point.reason_count === 1 ? 'reason' : 'reasons'}
            </Text>
          ) : null}
          {linked.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ expanded: open === id }}
              accessibilityLabel={`Show quote ${quotes.get(id)!.n}`}
              onPress={() => {
                if (open !== id) track('summary_quote_opened', {});
                setOpen(open === id ? null : id);
              }}
              style={{
                paddingHorizontal: space[2],
                paddingVertical: space[1],
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: open === id ? c.ai : c.border,
              }}>
              <Text variant="caption" style={{ color: c.ai }}>
                Quote {quotes.get(id)!.n}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {open ? (
        <Text variant="quote" style={{ paddingLeft: space[3] }}>
          “{quotes.get(open)!.quote}”
        </Text>
      ) : null}
    </View>
  );
}

function SideCard({ side, title, label, body, pct, points, quotes }: {
  /** null = several options grouped together (polls with 3–4 options). */
  side: Side | null;
  title: string;
  label: string;
  body: string;
  pct: number | null;
  points?: SummaryPoint[];
  quotes: Map<string, { n: number; quote: string }>;
}) {
  const c = useColors();
  const s = useSideColors(side ?? 'a');
  const stripe = side ? s.strong : c.textFaint;
  return (
    <View
      accessibilityLabel={`${title}, ${side ? `option ${side.toUpperCase()}, ` : ''}${label}${pct != null ? `, ${pct.toFixed(0)} percent` : ''}. ${body}`}
      style={{
        backgroundColor: c.surfaceMuted,
        borderRadius: radius.lg,
        borderLeftWidth: 4,
        borderLeftColor: stripe,
        padding: space[4],
        gap: space[2],
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {side ? <SideBadge side={side} /> : null}
        <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
          {title} · {label}
        </Text>
        {pct != null ? (
          <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {pct.toFixed(0)}%
          </Text>
        ) : null}
      </View>
      {points?.length ? (
        points.map((p, i) => <PointRow key={i} point={p} quotes={quotes} />)
      ) : (
        <Text>{body}</Text>
      )}
    </View>
  );
}

export function AISummary({ result }: { result: Result }) {
  const c = useColors();
  const [flagged, setFlagged] = useState(false);
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
  const others = (result.options ?? []).filter((o) => o.side !== winner);
  // Two options: the other side has its own card. Three or four: every other option is grouped.
  const loser: Side | null = others.length === 1 ? others[0].side : null;
  const opt = (side: Side) => result.options?.find((o) => o.side === side);
  const label = (side: Side) => opt(side)?.label ?? `Option ${side.toUpperCase()}`;
  const pct = (side: Side) => (opt(side)?.pct != null ? Number(opt(side)!.pct) : null);
  const points = (side: Side | null) => s.points?.filter((p) => (side ? p.side === side : p.side !== winner));
  const quotes = new Map((result.featured ?? []).map((f, i) => [f.id, { n: i + 1, quote: f.quote }]));

  return (
    <View style={{ gap: space[3] }}>
      <Header count={count} />
      {count < FEW_REASONS ? (
        <Text variant="label" style={{ color: c.warning }}>
          Only a few reasons were given, so this summary may not reflect everyone.
        </Text>
      ) : null}
      <SideCard
        side={winner}
        title="Most said"
        label={label(winner)}
        body={s.majority!}
        pct={pct(winner)}
        points={points(winner)}
        quotes={quotes}
      />
      <SideCard
        side={loser}
        title="Others said"
        label={loser ? label(loser) : others.map((o) => label(o.side)).join(', ')}
        body={s.minority ?? 'Too few people explained this side to summarise it fairly.'}
        pct={loser ? pct(loser) : others.reduce((n, o) => n + Number(o.pct ?? 0), 0)}
        points={points(loser)}
        quotes={quotes}
      />
      {s.disclaimer ? (
        <Text variant="caption" tone="faint">
          {s.disclaimer}
        </Text>
      ) : null}
      <Text variant="caption" tone="faint">
        AI can miss nuance. The quotes are voters’ own words.
      </Text>
      <View style={{ flexDirection: 'row', gap: space[4] }}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            track('how_ai_works_opened', {});
            router.push('/how-ai-works');
          }}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: flagged }}
          hitSlop={8}
          disabled={flagged}
          onPress={() => {
            setFlagged(true);
            track('summary_flagged', {});
            // Best effort: goes to the admin AI-quality queue.
            rpc('flag_summary', { p_poll: result.poll_id }).catch(() => {});
          }}>
          <Text variant="label" tone="faint">
            {flagged ? 'Thanks, we’ll check it' : 'Summary seems off'}
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
