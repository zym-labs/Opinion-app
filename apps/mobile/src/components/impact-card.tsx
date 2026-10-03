// "Your impact": what your opinions did for other people this month, plus milestones that don't depend on
// daily streaks and a calibration score (how often you predict the room). Private to you.
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { radius, space, useColors } from '@/theme';

type Impact = {
  votes: number;
  reasons_quoted: number;
  helpful_marks: number;
  askers_followed: number;
  predictions: number;
  predictions_right: number;
  total_votes: number;
};

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

export function ImpactCard() {
  const c = useColors();
  const q = useQuery({ queryKey: ['impact'], queryFn: async () => (await rpc<Impact[]>('my_impact', { p_days: 30 }))[0] });
  const i = q.data;
  if (!i) return null;
  const reached = MILESTONES.filter((m) => i.total_votes >= m).pop();
  const next = MILESTONES.find((m) => i.total_votes < m);
  const calibration = i.predictions >= 5 ? Math.round((100 * i.predictions_right) / i.predictions) : null;
  const lines = [
    i.votes ? `You helped ${i.votes} ${i.votes === 1 ? 'person' : 'people'} decide.` : null,
    i.reasons_quoted ? `${i.reasons_quoted} of your reasons ${i.reasons_quoted === 1 ? 'was' : 'were'} quoted in results.` : null,
    i.helpful_marks ? `${i.helpful_marks} people said your words helped them.` : null,
    i.askers_followed ? `${i.askers_followed} ${i.askers_followed === 1 ? 'asker' : 'askers'} went with your pick.` : null,
  ].filter(Boolean);

  return (
    <View
      accessible
      style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
      <Text variant="label" tone="muted">
        Your impact · last 30 days
      </Text>
      {lines.length ? lines.map((l) => <Text key={l!}>{l}</Text>) : <Text tone="muted">Vote on a few polls and your impact shows up here.</Text>}
      {calibration !== null ? (
        <Text variant="caption" tone="faint">
          You predict the room {calibration}% of the time ({i.predictions} predictions).
        </Text>
      ) : null}
      <Text variant="caption" tone="faint">
        {reached ? `Milestone: ${reached} opinions given.` : ''}
        {next ? ` ${next - i.total_votes} more to ${next}.` : ''}
      </Text>
    </View>
  );
}
