// AI second opinion for the asker, shown after the human result, never instead of it. Labelled as AI,
// no persona, generated once per poll on request.
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { callFunction, errorMessage } from '@/lib/api';
import { radius, space, useColors } from '@/theme';

export type AiTake = { leaning: string; why: string[]; consider: string; agrees_with_room: boolean; label: string };

export function AiTakeCard({ pollId, initial }: { pollId: string; initial?: AiTake | null }) {
  const c = useColors();
  const [take, setTake] = useState<AiTake | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!take) {
    return (
      <View style={{ gap: space[2] }}>
        <Button
          label="Get an AI second opinion"
          variant="ghost"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await callFunction<{ take: AiTake }>('second-opinion', { poll_id: pollId });
              track('ai_take_opened', {});
              setTake(res.take);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        {error ? <Banner tone="danger" message={error} /> : null}
      </View>
    );
  }
  return (
    <View style={{ borderWidth: 1, borderColor: c.ai, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
      <Text variant="label" style={{ color: c.ai }}>
        AI second opinion · {take.agrees_with_room ? 'agrees with the room' : 'sees it differently'}
      </Text>
      <Text variant="bodyStrong">Leans: {take.leaning}</Text>
      {take.why.map((w) => (
        <Text key={w}>• {w}</Text>
      ))}
      <Text tone="muted">Ask yourself: {take.consider}</Text>
      <Text variant="caption" tone="faint">
        {take.label}
      </Text>
    </View>
  );
}
