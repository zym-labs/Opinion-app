// Room mode, host side: an anonymous group decision for people in the same place (a party, a class, a club).
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CrisisSupport } from '@/components/crisis-support';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { track } from '@/lib/analytics';
import { ApiError, callFunction, errorMessage } from '@/lib/api';
import { space } from '@/theme';

const MINUTES = [10, 30, 60, 120];

export default function NewRoom() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const filled = options.map((o) => o.trim()).filter(Boolean);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { code } = await callFunction<{ code: string }>('rooms', { question: question.trim(), labels: filled, minutes });
      track('room_created', { options: filled.length });
      router.replace({ pathname: '/room/[code]', params: { code } });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CRISIS_SUPPORT') setCrisis(true);
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (crisis) {
    return (
      <Screen>
        <CrisisSupport onClose={() => setCrisis(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text tone="muted">
        Everyone here scans your code and votes on their phone. Nobody sees who picked what, and the result appears when
        you reveal it (with at least 3 votes).
      </Text>
      <TextField label="Question" value={question} onChangeText={(t) => setQuestion(t.slice(0, 120))} placeholder="Pizza or tacos tonight?" />
      {options.map((o, i) => (
        <TextField
          key={i}
          label={`Option ${String.fromCharCode(65 + i)}`}
          value={o}
          onChangeText={(t) => setOptions(options.map((x, j) => (j === i ? t.slice(0, 60) : x)))}
        />
      ))}
      {options.length < 4 ? <Button label="Add option" variant="ghost" onPress={() => setOptions([...options, ''])} /> : null}
      <Text variant="label" tone="muted">
        Open for
      </Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {MINUTES.map((m) => (
          <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60} h`} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </View>
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Open the room" loading={busy} disabled={question.trim().length < 5 || filled.length < 2} onPress={create} />
    </Screen>
  );
}
