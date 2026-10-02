// F-02 Vote → F-03 submitted (STAGE1 §3, STAGE6 §8).
import { LIMITS, motion } from '@opinion/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { CountdownPill, timeLeft } from '@/components/poll/countdown';
import { OptionTile } from '@/components/poll/option-tile';
import { TypeBadge } from '@/components/poll/poll-card';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { timeBucket, track } from '@/lib/analytics';
import { ApiError, callFunction, errorMessage, rpc } from '@/lib/api';
import { useOffline } from '@/lib/offline';
import { keys } from '@/lib/queries';
import type { FeedPoll, Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

export default function Vote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const qc = useQueryClient();
  const poll = useQuery({
    queryKey: ['poll', id],
    queryFn: async () => (await rpc<FeedPoll[]>('get_poll_for_vote', { p_poll: id }))[0] ?? null,
  });
  const [side, setSide] = useState<Side | null>(null);
  const [reason, setReason] = useState('');
  const [predicted, setPredicted] = useState<Side | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ closes_at: string; credit_units: number } | null>(null);
  const idempotencyKey = useRef(Crypto.randomUUID()).current;
  const offline = useOffline();
  const reduceMotion = useReducedMotion();

  const p = poll.data;
  if (poll.isLoading) return <Screen><ScreenSkeleton /></Screen>;
  if (!p) {
    // F-07 Poll unavailable (closed, removed, already voted or not eligible).
    return (
      <Screen>
        <Text variant="title">This poll isn’t available</Text>
        <Text tone="muted">It may have closed, been removed, or you’ve already voted.</Text>
        <Button label="Back to feed" onPress={() => router.back()} />
      </Screen>
    );
  }

  const reasonRequired = p.type === 'expert' && !p.is_taste;
  const reasonLen = reason.trim().length;
  const reasonOk = reasonRequired ? reasonLen >= LIMITS.reasonMin : true;
  const canSubmit = !!side && reasonOk && consent && reasonLen <= LIMITS.reasonMax && !offline;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await callFunction<{ closes_at: string; credit_units: number }>(
        'votes',
        { poll_id: id, side, reason: reason.trim() || null, predicted_side: predicted, feature_consent: consent },
        { idempotencyKey, signed: true },
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      track('vote_cast', {
        type: p!.type,
        is_taste: p!.is_taste,
        with_reason: reasonLen > 0,
        predicted: !!predicted,
        seconds_left_bucket: timeBucket(p!.closes_at),
      });
      setDone(res);
      qc.invalidateQueries({ queryKey: keys.feed });
      qc.invalidateQueries({ queryKey: keys.waiting });
      qc.invalidateQueries({ queryKey: keys.credits });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      track('vote_failed', { code: e instanceof ApiError ? e.code : 'UNKNOWN' });
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    Alert.alert('Votes are final', 'You can’t change your vote after submitting.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit vote', onPress: submit },
    ]);
  }

  if (done) {
    const units = done.credit_units % 3;
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <Stack.Screen options={{ title: '' }} />
        <Text variant="title">Vote submitted</Text>
        <Text tone="muted">
          {units === 0 ? 'You’ve earned a new poll.' : `${units}/3 votes towards your next poll.`}
        </Text>
        <Text tone="muted">Results in {timeLeft(done.closes_at) ?? 'a moment'}. We’ll let you know.</Text>
        <Button label="Back to feed" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push({ pathname: '/report', params: { target: 'poll', id: p.id, hide: '1' } })}>
              <Text variant="label" tone="muted">
                Report
              </Text>
            </Pressable>
          ),
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="caption" tone="muted" style={{ flex: 1 }}>
          <TypeBadge type={p.type} isTaste={p.is_taste} />
          {p.target_label ? ` · ${p.target_label}` : ''}
        </Text>
        <CountdownPill closesAt={p.closes_at} />
      </View>
      {p.follow_up_of ? (
        <Text variant="label" tone="muted">
          Follow-up to “{p.follow_up_of}”
        </Text>
      ) : null}
      <Text variant="question">{p.question}</Text>
      <Link.AppleZoomTarget>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }} accessibilityRole="radiogroup">
          {p.options.map((o) => (
            <OptionTile key={o.side} option={o} selected={side === o.side} onPress={() => setSide(o.side)} />
          ))}
        </View>
      </Link.AppleZoomTarget>

      {/* Details slide up once an option is picked (STAGE6 v2 P1): one decision at a time. */}
      {side ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.springify().dampingRatio(1).duration(motion.spatial.duration)}
          style={{ gap: space[4] }}>
          <TextField
            label={reasonRequired ? `Why? (required, at least ${LIMITS.reasonMin} characters)` : 'Why? (optional)'}
            value={reason}
            onChangeText={(t) => setReason(t.slice(0, LIMITS.reasonMax))}
            multiline
            style={{ minHeight: 96, textAlignVertical: 'top', paddingTop: space[3] }}
          />
          <Text
            variant="caption"
            style={{ alignSelf: 'flex-end', color: reasonRequired && reasonLen < LIMITS.reasonMin ? c.warning : c.textFaint }}>
            {reasonLen}/{LIMITS.reasonMax}
          </Text>
          {/* Privacy cue at the moment of writing (STAGE6 v2 §Privacy). */}
          <View
            style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-start', padding: space[3], borderRadius: radius.sm, backgroundColor: c.surfaceMuted }}>
            <Lock size={16} color={c.textMuted} strokeWidth={1.75} style={{ marginTop: 2 }} />
            <Text variant="label" tone="muted" style={{ flex: 1 }}>
              Your name is never shown. Your reason may be quoted anonymously, so leave out details that identify you or
              anyone else.
            </Text>
          </View>

          <View style={{ gap: space[2] }}>
            <Text variant="label" tone="muted">
              What will most people pick? (optional)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {p.options.map(({ side: s }) => (
                <Chip key={s} label={s.toUpperCase()} selected={predicted === s} onPress={() => setPredicted(predicted === s ? null : s)} />
              ))}
            </View>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent(!consent)}
            style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: consent ? c.primary : c.border,
                backgroundColor: consent ? c.primary : 'transparent',
              }}
            />
            <Text variant="label" style={{ flex: 1 }}>
              My reason may be featured anonymously in the results
            </Text>
          </Pressable>


        </Animated.View>
      ) : (
        <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>
          Pick an option to continue.
        </Text>
      )}
      {offline ? <Banner tone="warning" message="You’re offline. Connect to vote." /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Submit vote — final" disabled={!canSubmit} loading={busy} onPress={confirm} />
    </Screen>
  );
}
