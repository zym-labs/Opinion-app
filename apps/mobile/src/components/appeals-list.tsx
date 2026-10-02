// Moderation decisions against me, each appealable once within 6 months (DSA Art. 20).
// Used by the Appeals screen and the Suspended screen (suspended accounts must still be able to appeal).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage, rpc } from '@/lib/api';
import { radius, space, useColors } from '@/theme';

type Decision = {
  action_id: string;
  action: 'remove' | 'warn' | 'suspend';
  rule: string | null;
  created_at: string;
  question: string | null;
  appeal_status: 'open' | 'upheld' | 'reversed' | null;
  can_appeal: boolean;
};

const ACTION = { remove: 'Content removed', warn: 'Warning', suspend: 'Account suspended' } as const;
const OUTCOME = {
  open: 'Appeal sent. A different moderator will review it.',
  upheld: 'Appeal reviewed: the decision stands.',
  reversed: 'Appeal accepted: the decision was reversed.',
} as const;

function DecisionCard({ d }: { d: Decision }) {
  const c = useColors();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await rpc('submit_appeal', { p_action: d.action_id, p_message: message });
      await qc.invalidateQueries({ queryKey: ['my-moderation'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space[4], gap: space[2] }}>
      <Text variant="bodyStrong">{ACTION[d.action]}</Text>
      {d.question ? <Text tone="muted">{d.question}</Text> : null}
      <Text variant="caption" tone="faint">
        {new Date(d.created_at).toLocaleDateString()}
        {d.rule ? ` · rule: ${d.rule.replace(/_/g, ' ')}` : ''}
      </Text>
      {d.appeal_status ? (
        <Text variant="label">{OUTCOME[d.appeal_status]}</Text>
      ) : d.can_appeal ? (
        open ? (
          <>
            <TextField
              label="Why should we look again?"
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, 1000))}
              multiline
              style={{ minHeight: 100, textAlignVertical: 'top', paddingTop: space[3] }}
            />
            {error ? <Banner tone="danger" message={error} /> : null}
            <Button label="Send appeal" loading={busy} disabled={message.trim().length < 10} onPress={send} />
          </>
        ) : (
          <Button label="Appeal" variant="secondary" onPress={() => setOpen(true)} />
        )
      ) : (
        <Text variant="caption" tone="faint">The appeal window for this decision has closed.</Text>
      )}
    </View>
  );
}

export function AppealsList() {
  const q = useQuery({ queryKey: ['my-moderation'], queryFn: () => rpc<Decision[]>('my_moderation_actions') });
  if (q.isLoading) return <ScreenSkeleton />;
  if (!q.data?.length) return <Text tone="muted">No moderation decisions on your account.</Text>;
  return q.data.map((d) => <DecisionCard key={d.action_id} d={d} />);
}
