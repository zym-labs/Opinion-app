// F-02 Vote → F-03 submitted (STAGE1 §3, STAGE6 §8).
import { LIMITS } from '@opinion/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { CountdownPill, timeLeft } from '@/components/poll/countdown';
import { OptionTile } from '@/components/poll/option-tile';
import { TypeBadge } from '@/components/poll/poll-card';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { callFunction, errorMessage, rpc } from '@/lib/api';
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

  const p = poll.data;
  if (poll.isLoading) return <Screen><Text tone="muted">Loading…</Text></Screen>;
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
  const canSubmit = !!side && reasonOk && consent && reasonLen <= LIMITS.reasonMax;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await callFunction<{ closes_at: string; credit_units: number }>(
        'votes',
        { poll_id: id, side, reason: reason.trim() || null, predicted_side: predicted, feature_consent: consent },
        { idempotencyKey },
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(res);
      qc.invalidateQueries({ queryKey: keys.feed });
      qc.invalidateQueries({ queryKey: keys.waiting });
      qc.invalidateQueries({ queryKey: keys.credits });
    } catch (e) {
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
      <Text variant="question">{p.question}</Text>
      <View style={{ flexDirection: 'row', gap: space[3] }} accessibilityRole="radiogroup">
        {p.options.map((o) => (
          <OptionTile key={o.side} option={o} selected={side === o.side} onPress={() => setSide(o.side)} />
        ))}
      </View>

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

      <View style={{ gap: space[2] }}>
        <Text variant="label" tone="muted">
          What will most people pick? (optional)
        </Text>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {(['a', 'b'] as const).map((s) => (
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

      <View
        style={{ flexDirection: 'row', gap: space[2], alignItems: 'center', padding: space[3], borderRadius: radius.sm, backgroundColor: c.surfaceMuted }}>
        <Lock size={16} color={c.textMuted} strokeWidth={1.75} />
        <Text variant="label" tone="muted">
          Your vote and reason are private.
        </Text>
      </View>

      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Submit vote — final" disabled={!canSubmit} loading={busy} onPress={confirm} />
    </Screen>
  );
}
