import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

import { Banner } from '@/components/ui/banner';
import { Text } from '@/components/ui/text';
import type { Result } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

import { SideBadge, useSideColors } from './option-tile';

function Bar({ pct, side }: { pct: number; side: 'a' | 'b' }) {
  const c = useColors();
  const s = useSideColors(side);
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [pct, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return (
    <View style={{ height: 10, borderRadius: radius.full, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: s.strong, borderRadius: radius.full }, style]} />
    </View>
  );
}

function ResultRows({ result }: { result: Result }) {
  return (
    <View style={{ gap: space[4] }}>
      {result.options?.map((o) => {
        const pct = Number(o.pct ?? 0);
        const mine = result.you?.side === o.side;
        const label = `${o.label ?? 'Image option'} ${pct.toFixed(0)} percent${mine ? ', your pick' : ''}${result.winner === o.side ? ', majority' : ''}`;
        return (
          <View key={o.side} style={{ gap: space[2] }} accessible accessibilityLabel={label}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <SideBadge side={o.side} />
              <Text variant={result.winner === o.side ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
                {o.label ?? 'Image option'}
                {mine ? '  ← You' : ''}
              </Text>
              <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
                {pct.toFixed(0)}%
              </Text>
            </View>
            <Bar pct={pct} side={o.side} />
          </View>
        );
      })}
    </View>
  );
}

function AISummary({ result }: { result: Result }) {
  const c = useColors();
  if (result.state === 'summary_pending') return <Banner message="AI summary is on its way." />;
  if (result.state === 'summary_failed' || !result.summary?.majority) return null;
  const s = result.summary;
  return (
    <View style={{ backgroundColor: c.surfaceMuted, borderRadius: radius.lg, padding: space[4], gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Sparkles size={16} strokeWidth={1.75} color={c.ai} />
        <Text variant="label" style={{ color: c.ai }}>
          AI summary
        </Text>
      </View>
      <View style={{ gap: space[1] }}>
        <Text variant="label" tone="muted">
          Majority
        </Text>
        <Text>{s.majority}</Text>
      </View>
      <View style={{ gap: space[1] }}>
        <Text variant="label" tone="muted">
          Minority
        </Text>
        <Text>{s.minority ?? 'A minority disagreed.'}</Text>
      </View>
      <Text variant="caption" tone="faint">
        {s.label}
        {s.disclaimer ? ` ${s.disclaimer}` : ''}
      </Text>
    </View>
  );
}

function Insight({ quote, side, id }: { quote: string; side: 'a' | 'b'; id: string }) {
  const c = useColors();
  const s = useSideColors(side);
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: s.strong,
        backgroundColor: c.surface,
        borderRadius: radius.sm,
        padding: space[3],
        gap: space[2],
      }}>
      <Text variant="quote">“{quote}”</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/report', params: { target: 'featured_insight', id } })}
        hitSlop={8}
        style={{ alignSelf: 'flex-end' }}>
        <Text variant="caption" tone="faint">
          Report
        </Text>
      </Pressable>
    </View>
  );
}

export function ResultView({ result }: { result: Result }) {
  if (result.state === 'not_enough_responses') {
    return (
      <View style={{ gap: space[3] }}>
        <Text variant="question">{result.question}</Text>
        <Banner message={`Not enough people voted to show results (${result.total_votes ?? 0} of 10 needed).`} />
      </View>
    );
  }
  const you = result.you;
  return (
    <View style={{ gap: space[5] }}>
      {result.view_once ? <Banner message="You can view this result once." /> : null}
      <Text variant="question">{result.question}</Text>
      <ResultRows result={result} />
      <Text variant="label" tone="muted">
        {result.total_votes} votes
        {you?.in_majority === true ? ' · You picked the majority ✓' : you?.in_majority === false ? ' · You were in the minority' : ''}
        {you?.predicted_correctly ? ' · You predicted correctly' : ''}
      </Text>
      <AISummary result={result} />
      {result.featured?.length ? (
        <View style={{ gap: space[3] }}>
          <Text variant="label" tone="muted">
            Featured insights
          </Text>
          {result.featured.map((f) => (
            <Insight key={f.id} {...f} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
