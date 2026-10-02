// "What did you decide?" — the asker closes the loop; voters hear the outcome anonymously.
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { errorMessage, rpc } from '@/lib/api';
import type { MyPoll, PollOption, Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

export function DecisionCard({ poll, options }: { poll: MyPoll; options: PollOption[] }) {
  const c = useColors();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<Side | 'none' | null>(null);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = (side: Side) => options.find((o) => o.side === side)?.label ?? `Option ${side.toUpperCase()}`;

  const box = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[3] } as const;

  if (poll.decided_at) {
    return (
      <View style={box}>
        <Text variant="label" tone="muted">
          Your decision
        </Text>
        <Text variant="bodyStrong">{poll.decision_none ? 'None of the options' : label(poll.decision_side!)}</Text>
        <Text variant="caption" tone="faint">
          Voters were told what you chose. They never learn who you are.
        </Text>
      </View>
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await rpc('record_decision', { p_poll: poll.id, p_side: choice === 'none' ? null : choice, p_helpful: helpful });
      await qc.invalidateQueries({ queryKey: ['my-poll', poll.id] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={box}>
      <Text variant="bodyStrong">What did you decide?</Text>
      <Text variant="label" tone="muted">
        Voters see what you went with, anonymously. It’s the best thanks they get on Opinion.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {options.map((o) => (
          <Chip key={o.side} label={`${o.side.toUpperCase()} · ${label(o.side)}`} selected={choice === o.side} onPress={() => setChoice(o.side)} />
        ))}
        <Chip label="None of these" selected={choice === 'none'} onPress={() => setChoice('none')} />
      </View>
      <Text variant="label" tone="muted">
        Did the poll help? (optional)
      </Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <Chip label="Yes" selected={helpful === true} onPress={() => setHelpful(helpful === true ? null : true)} />
        <Chip label="Not really" selected={helpful === false} onPress={() => setHelpful(helpful === false ? null : false)} />
      </View>
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Share my decision" disabled={!choice} loading={busy} onPress={save} />
    </View>
  );
}
