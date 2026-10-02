// F-05 v2: the once-only reveal as a tap-through story (STAGE6 v2 §Reveal).
// Sealed → your pick → the split → AI summary → voters' words → goodbye.
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import type { Result, Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

import { AISummary } from './ai-summary';
import { SideBadge, useSideColors } from './option-tile';
import { segmentsOf, SplitBar } from './split-bar';
import { VerifiedLine, verifiedText } from './verified-line';

// interactive cards hold links, so they advance with a Next button instead of tap zones.
type Card = { key: string; label: string; body: ReactNode; interactive?: boolean };

function Quote({ quote, side, id }: { quote: string; side: Side; id: string }) {
  const c = useColors();
  const s = useSideColors(side);
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: s.strong, paddingLeft: space[3], gap: space[1] }}>
      <Text variant="quote">“{quote}”</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report this quote"
        hitSlop={8}
        onPress={() => router.push({ pathname: '/report', params: { target: 'featured_insight', id } })}
        style={{ alignSelf: 'flex-start' }}>
        <Text variant="caption" style={{ color: c.textFaint }}>
          Report
        </Text>
      </Pressable>
    </View>
  );
}

export function buildCards(r: Result, faint: string, starter: boolean): Card[] {
  const opt = (side: Side) => r.options?.find((o) => o.side === side);
  const name = (side: Side) => opt(side)?.label ?? `Option ${side.toUpperCase()}`;
  const pct = (side: Side) => Number(opt(side)?.pct ?? 0);
  const mine = r.you?.side;
  const sides = (r.options ?? []).map((o) => o.side);
  const cards: Card[] = [];

  cards.push({
    key: 'sealed',
    label: `Your poll has closed. ${r.total_votes} people voted on: ${r.question}. Tap to reveal.`,
    body: (
      <>
        <Text variant="label" tone="muted">
          The poll has closed
        </Text>
        <Text variant="title">{r.question}</Text>
        <Text tone="muted">
          {starter
            ? `A real poll that ran on Opinion. ${r.total_votes} people voted.`
            : `${r.total_votes} people voted. You can see this result once.`}
        </Text>
      </>
    ),
  });

  if (mine) {
    cards.push({
      key: 'pick',
      label: `You picked option ${mine.toUpperCase()}, ${name(mine)}. Tap to see how everyone voted.`,
      body: (
        <>
          <Text variant="label" tone="muted">
            You picked
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <SideBadge side={mine} />
            <Text variant="title" style={{ flex: 1 }}>
              {name(mine)}
            </Text>
          </View>
          <Text tone="muted">Let’s see how everyone else voted.</Text>
        </>
      ),
    });
  }

  const majorityLine =
    r.you?.in_majority === true
      ? 'You were with the majority.'
      : r.you?.in_majority === false
        ? 'You saw it differently from most people.'
        : 'It was a tie.';
  cards.push({
    key: 'split',
    label: sides
      .map((s) => `Option ${s.toUpperCase()}, ${name(s)}, ${pct(s).toFixed(0)} percent${mine === s ? ', your pick' : ''}`)
      .join('. ') + `. ${verifiedText(r) ? `${verifiedText(r)}. ` : ''}${majorityLine}${r.you?.predicted_correctly ? ' You also predicted the result correctly.' : ''}`,
    body: (
      <>
        <Text variant="label" tone="muted">
          The room said
        </Text>
        {sides.map((s) => (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <SideBadge side={s} />
            <Text variant={r.winner === s ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
              {name(s)}
              {mine === s ? '  · you' : ''}
            </Text>
            <Text variant="display" style={{ fontSize: 32, lineHeight: 36, fontVariant: ['tabular-nums'] }}>
              {pct(s).toFixed(0)}%
            </Text>
          </View>
        ))}
        <SplitBar segments={segmentsOf(r.options)} haptic />
        <VerifiedLine result={r} />
        <Text tone="muted">
          {majorityLine}
          {r.you?.predicted_correctly ? ' And you called it.' : ''}
        </Text>
      </>
    ),
  });

  if (r.state !== 'summary_failed' || (r.reason_count ?? 0) > 0) {
    cards.push({
      key: 'ai',
      label: r.summary?.majority
        ? `Written by AI from ${r.reason_count} voters' reasons. Most said: ${r.summary.majority} Others said: ${r.summary.minority ?? 'too few explained this side to summarise it fairly.'}`
        : 'The AI summary is not available yet.',
      body: <AISummary result={r} />,
      interactive: true,
    });
  }

  if (r.featured?.length) {
    cards.push({
      key: 'quotes',
      interactive: true,
      label: `In voters' own words. ${r.featured.map((f) => `Option ${f.side.toUpperCase()}: ${f.quote}`).join('. ')}`,
      body: (
        <>
          <Text variant="label" tone="muted">
            In voters’ own words
          </Text>
          {r.featured.map((f) => (
            <Quote key={f.id} {...f} />
          ))}
          <Text variant="caption" tone="faint">
            Chosen by the AI for variety, always including the minority view when there is one. Shared anonymously with the
            voters’ consent.
          </Text>
        </>
      ),
    });
  }

  if (starter) {
    cards.push({
      key: 'end',
      label: 'That was a real poll from Opinion. Tap Next to continue.',
      body: (
        <>
          <Text variant="title">That’s how a result arrives.</Text>
          <Text tone="muted">
            On Opinion, every poll ends like this: the split, an AI summary of both sides, and the reasons in voters’ own
            words. Practice votes aren’t saved.
          </Text>
        </>
      ),
    });
    return cards;
  }

  cards.push({
    key: 'end',
    label: 'That is the result. It will now leave your feed. Tap Done to finish.',
    body: (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Lock size={18} strokeWidth={1.75} color={faint} />
          <Text variant="label" tone="muted">
            Gone after this
          </Text>
        </View>
        <Text variant="title">Thanks for weighing in.</Text>
        <Text tone="muted">
          This result now leaves your feed. Your vote stays anonymous and still counts towards your profile stats.
        </Text>
      </>
    ),
  });
  return cards;
}

/** Calls onFinish when the user leaves the last card (that's when the result counts as viewed). */
export function ResultStory({
  result,
  onFinish,
  starter = false,
}: {
  result: Result;
  onFinish: () => void;
  /** Starter polls are practice: no view-once wording, different last card. */
  starter?: boolean;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const cards = buildCards(result, c.textFaint, starter);
  const [i, setI] = useState(0);
  // How far voters get through the reveal (not tracked for starter polls).
  const seen = useRef({ max: 1, finished: false });
  useEffect(() => {
    seen.current.max = Math.max(seen.current.max, i + 1);
  }, [i]);
  useEffect(() => {
    const s = seen.current;
    return () => {
      if (!starter) track('result_viewed', { state: result.state, cards_seen: s.max, finished: s.finished });
    };
  }, [starter, result.state]);
  const last = i === cards.length - 1;

  const go = (next: number) => {
    if (next < 0) return;
    if (next >= cards.length) {
      seen.current.finished = true;
      return onFinish();
    }
    Haptics.selectionAsync();
    setI(next);
  };
  const card = cards[i];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <View
        style={{ flexDirection: 'row', gap: space[1], paddingHorizontal: space[4], paddingTop: space[2] }}
        accessible
        accessibilityLabel={`Card ${i + 1} of ${cards.length}`}>
        {cards.map((k, n) => (
          <View
            key={k.key}
            style={{ flex: 1, height: 3, borderRadius: radius.full, backgroundColor: n <= i ? c.text : c.border }}
          />
        ))}
      </View>

      <View style={{ flex: 1 }}>
        <Animated.View
          key={card.key}
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space[6], gap: space[5] }}
            // Plain cards read as one label; cards with buttons must keep their children reachable.
            accessible={!card.interactive}
            accessibilityLabel={card.interactive ? undefined : card.label}>
            {card.body}
          </ScrollView>
        </Animated.View>
        {/* Tap zones: left third goes back, the rest goes forward (Stories convention). */}
        {!last && !card.interactive ? (
          <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' }} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous"
              style={{ flex: 1 }}
              disabled={i === 0}
              onPress={() => go(i - 1)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              style={{ flex: 2 }}
              onPress={() => go(i + 1)}
            />
          </View>
        ) : null}
      </View>

      <View style={{ padding: space[4], gap: space[2] }}>
        {last ? (
          <Button
            label={starter ? 'Next' : 'Done'}
            onPress={() => {
              seen.current.finished = true;
              onFinish();
            }}
          />
        ) : card.interactive ? (
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <View style={{ flex: 1 }}>
              <Button label="Back" variant="secondary" onPress={() => go(i - 1)} />
            </View>
            <View style={{ flex: 2 }}>
              <Button label="Next" onPress={() => go(i + 1)} />
            </View>
          </View>
        ) : (
          <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
            Tap to continue
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
