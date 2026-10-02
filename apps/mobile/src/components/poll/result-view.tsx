// Static result (M-03, creator's permanent history). Voters get ResultStory instead.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Text } from '@/components/ui/text';
import type { Result, Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

import { AISummary } from './ai-summary';
import { SideBadge, useSideColors } from './option-tile';
import { segmentsOf, SplitBar } from './split-bar';
import { VerifiedLine } from './verified-line';

function Insight({ quote, side, id }: { quote: string; side: Side; id: string }) {
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
  return (
    <View style={{ gap: space[5] }}>
      <Text variant="question">{result.question}</Text>
      <View style={{ gap: space[3] }}>
        {result.options?.map((o) => {
          const pct = Number(o.pct ?? 0);
          return (
            <View
              key={o.side}
              accessible
              accessibilityLabel={`Option ${o.side.toUpperCase()}, ${o.label ?? 'image option'}, ${pct.toFixed(0)} percent${result.winner === o.side ? ', majority' : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <SideBadge side={o.side} />
              <Text variant={result.winner === o.side ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
                {o.label ?? 'Image option'}
              </Text>
              <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
                {pct.toFixed(0)}%
              </Text>
            </View>
          );
        })}
        <SplitBar segments={segmentsOf(result.options)} />
        <VerifiedLine result={result} />
        <Text variant="label" tone="muted">
          {result.total_votes} votes
        </Text>
      </View>
      <AISummary result={result} />
      {result.featured?.length ? (
        <View style={{ gap: space[3] }}>
          <Text variant="label" tone="muted">
            In voters’ own words
          </Text>
          {result.featured.map((f) => (
            <Insight key={f.id} {...f} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
