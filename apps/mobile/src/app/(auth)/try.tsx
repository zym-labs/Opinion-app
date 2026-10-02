// Try before signing up (STAGE6 v2 P0): age check → practice votes on 3 starter polls, each
// followed by its real reveal → create account. Practice votes are never sent to the server.
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OptionTile } from '@/components/poll/option-tile';
import { ResultStory } from '@/components/poll/result-story';
import { StepHeader } from '@/components/step-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { rpc } from '@/lib/api';
import { getPendingBirthYear, isAdult, setPendingBirthYear } from '@/lib/pending-age';
import type { Side, StarterPoll } from '@/lib/types';
import { space } from '@/theme';

type Step = { kind: 'age' } | { kind: 'blocked' } | { kind: 'vote'; i: number } | { kind: 'reveal'; i: number; side: Side } | { kind: 'done' };

function AgeStep({ onDone }: { onDone: (adult: boolean) => void }) {
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  function submit() {
    const y = Number(year);
    if (!/^\d{4}$/.test(year) || y < 1900 || y > new Date().getFullYear()) return setError('Enter the year you were born, e.g. 2001.');
    if (isAdult(y)) setPendingBirthYear(y);
    onDone(isAdult(y));
  }
  return (
    <Screen>
      <StepHeader
        step={1}
        total={2}
        title="First, what year were you born?"
        body="Opinion is for adults. We keep only your birth year, on this phone until you sign up."
      />
      <TextField
        label="Birth year"
        value={year}
        onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        placeholder="YYYY"
        onSubmitEditing={submit}
      />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Continue" onPress={submit} />
    </Screen>
  );
}

function VoteStep({ poll, n, total, onVote }: { poll: StarterPoll; n: number; total: number; onVote: (side: Side) => void }) {
  const [side, setSide] = useState<Side | null>(null);
  const [reason, setReason] = useState('');
  return (
    <Screen>
      <StepHeader step={2} total={2} title={`Practice poll ${n} of ${total}`} />
      <Text variant="question">{poll.question}</Text>
      <View style={{ flexDirection: 'row', gap: space[3] }} accessibilityRole="radiogroup">
        {poll.options?.map((o) => (
          <OptionTile key={o.side} option={o} selected={side === o.side} onPress={() => setSide(o.side)} />
        ))}
      </View>
      <TextField
        label="Why? (optional)"
        value={reason}
        onChangeText={(t) => setReason(t.slice(0, 200))}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: space[3] }}
      />
      <Text variant="caption" tone="faint">
        Practice vote: nothing you choose or write here is saved or shown to anyone.
      </Text>
      <Button label="Vote and see the result" disabled={!side} onPress={() => side && onVote(side)} />
    </Screen>
  );
}

export default function Try() {
  const starters = useQuery({
    queryKey: ['starter-polls'],
    queryFn: () => rpc<StarterPoll[]>('get_starter_polls'),
    staleTime: 60 * 60_000,
  });
  const pending = useQuery({ queryKey: ['pending-age'], queryFn: getPendingBirthYear, gcTime: 0 });
  const [step, setStep] = useState<Step | null>(null);

  const polls = starters.data ?? [];
  if (starters.isLoading || pending.isLoading) return <Screen><Text tone="muted">Loading…</Text></Screen>;

  const current: Step =
    step ?? (pending.data && isAdult(pending.data) ? (polls.length ? { kind: 'vote', i: 0 } : { kind: 'done' }) : { kind: 'age' });
  const next = (i: number): Step => (i + 1 < polls.length ? { kind: 'vote', i: i + 1 } : { kind: 'done' });

  switch (current.kind) {
    case 'age':
      return (
        <AgeStep onDone={(adult) => setStep(adult ? (polls.length ? { kind: 'vote', i: 0 } : { kind: 'done' }) : { kind: 'blocked' })} />
      );
    case 'blocked':
      return (
        <Screen style={{ justifyContent: 'center' }}>
          <Text variant="title">Opinion is 18+</Text>
          <Text tone="muted">Sorry, you need to be 18 or older to use Opinion.</Text>
        </Screen>
      );
    case 'vote':
      return (
        <VoteStep
          key={current.i}
          poll={polls[current.i]}
          n={current.i + 1}
          total={polls.length}
          onVote={(side) => setStep({ kind: 'reveal', i: current.i, side })}
        />
      );
    case 'reveal': {
      const poll = polls[current.i];
      const you = { side: current.side, in_majority: poll.winner ? poll.winner === current.side : null, predicted_correctly: null };
      return (
        <>
          <Stack.Screen options={{ gestureEnabled: false }} />
          <ResultStory starter result={{ ...poll, you }} onFinish={() => setStep(next(current.i))} />
        </>
      );
    }
    case 'done':
      return (
        <Screen style={{ justifyContent: 'center' }}>
          <Text variant="title">Ready to ask your own?</Text>
          <Text tone="muted">
            Create an account to vote on live polls, get results like these for your own questions, and keep your vote
            anonymous every time.
          </Text>
          <Button label="Create account" onPress={() => router.replace('/')} />
        </Screen>
      );
  }
}
