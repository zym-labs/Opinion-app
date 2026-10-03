// Decision journal: every decision you asked about, what the room said, what you chose and,
// 30 days on, whether you're glad. Private to you. Patterns appear once there are a few entries.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Share, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { rpc } from '@/lib/api';
import { usePlus } from '@/lib/queries';
import { maybeAskForReview } from '@/lib/review';
import { radius, space, useColors } from '@/theme';

type Entry = {
  poll_id: string;
  question: string;
  closed_at: string;
  total_votes: number | null;
  winner: string | null;
  winner_pct: number | null;
  chose: string | null;
  decision_none: boolean | null;
  decision_helpful: boolean | null;
  decided_at: string | null;
  followed_crowd: boolean | null;
  checkin_glad: boolean | null;
  checkin_due: boolean;
  reflection: { ten_minutes?: string; ten_months?: string; ten_years?: string } | null;
};

function Patterns({ entries }: { entries: Entry[] }) {
  const decided = entries.filter((e) => e.followed_crowd !== null);
  const checked = entries.filter((e) => e.checkin_glad !== null);
  if (decided.length < 3) return null;
  const withCrowd = decided.filter((e) => e.followed_crowd).length;
  const gladWith = checked.filter((e) => e.followed_crowd && e.checkin_glad).length;
  const gladAgainst = checked.filter((e) => e.followed_crowd === false && e.checkin_glad).length;
  const lines = [
    `You went with the room ${withCrowd} of ${decided.length} times.`,
    checked.length >= 3
      ? `Glad later: ${gladWith} when you followed the room, ${gladAgainst} when you didn’t.`
      : 'Check-ins 30 days after a decision will show which choices you were glad about.',
  ];
  return (
    <View style={{ gap: space[1] }}>
      <Text variant="label" tone="muted">
        Your patterns
      </Text>
      {lines.map((l) => (
        <Text key={l}>{l}</Text>
      ))}
    </View>
  );
}

function Checkin({ entry }: { entry: Entry }) {
  const qc = useQueryClient();
  async function save(glad: boolean) {
    await rpc('save_checkin', { p_poll: entry.poll_id, p_glad: glad }).catch(() => {});
    track('checkin_saved', { glad });
    if (glad) maybeAskForReview();
    qc.invalidateQueries({ queryKey: ['journal'] });
  }
  return (
    <View style={{ gap: space[2] }}>
      <Text variant="label">A month on: glad you chose {entry.chose}?</Text>
      <Text variant="caption" tone="faint">
        A good decision can still turn out badly. Judge the choice by what you knew then, not just how it ended.
      </Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <View style={{ flex: 1 }}>
          <Button label="Yes" variant="secondary" onPress={() => save(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Not really" variant="secondary" onPress={() => save(false)} />
        </View>
      </View>
    </View>
  );
}

/** Opinion+: export the journal as plain text through the share sheet (Notes, Files, email…). */
function ExportJournal({ entries }: { entries: Entry[] }) {
  const { data: plus } = usePlus();
  if (!plus?.active) {
    return <Button label="Export journal (Opinion+)" variant="ghost" onPress={() => router.push('/plus')} />;
  }
  const text = entries
    .map((e) =>
      [
        `${new Date(e.closed_at).toLocaleDateString()} · ${e.question}`,
        e.winner ? `The room: ${e.winner} (${Number(e.winner_pct ?? 0).toFixed(0)}%) of ${e.total_votes} votes` : 'No result',
        e.chose ? `I chose: ${e.chose}` : e.decision_none ? 'I chose none of them' : 'Decision not recorded',
        e.checkin_glad === null ? '' : `A month on: ${e.checkin_glad ? 'glad' : 'not so sure'}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
  return (
    <Button
      label="Export journal"
      variant="secondary"
      onPress={() => {
        track('journal_exported', {});
        Share.share({ title: 'My decision journal', message: text }).catch(() => {});
      }}
    />
  );
}

export default function Journal() {
  const c = useColors();
  const q = useQuery({ queryKey: ['journal'], queryFn: () => rpc<Entry[]>('my_journal') });
  if (q.isLoading) return <Screen><ScreenSkeleton /></Screen>;
  if (q.isError) return <Screen><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const entries = q.data ?? [];
  if (!entries.length) {
    return (
      <Screen>
        <EmptyState
          title="Your decisions will live here"
          body="Each poll you ask is kept with what people said and what you chose, so you can see how your decisions turned out."
        />
        <Button label="Ask something" onPress={() => router.navigate('/create')} />
      </Screen>
    );
  }
  return (
    <Screen onRefresh={() => q.refetch()}>
      <Text tone="muted">Only you can see this.</Text>
      <Patterns entries={entries} />
      <ExportJournal entries={entries} />
      {entries.map((e) => (
        <Pressable
          key={e.poll_id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/my-poll/[id]', params: { id: e.poll_id } })}
          style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
          <Text variant="caption" tone="faint">
            {new Date(e.closed_at).toLocaleDateString()}
          </Text>
          <Text variant="bodyStrong">{e.question}</Text>
          <Text tone="muted">
            {e.winner ? `The room: ${e.winner} (${Number(e.winner_pct ?? 0).toFixed(0)}%)` : 'Not enough votes for a result'}
          </Text>
          <Text>
            {e.chose
              ? `You chose ${e.chose}${e.followed_crowd === false ? ', against the room' : ''}.`
              : e.decision_none
                ? 'You went with none of the options.'
                : 'You haven’t said what you chose yet.'}
          </Text>
          {e.checkin_glad !== null ? (
            <Text variant="caption" tone="faint">
              A month on: {e.checkin_glad ? 'glad you did' : 'not so sure'}
            </Text>
          ) : null}
          {e.reflection && Object.values(e.reflection).some(Boolean) ? (
            <Text variant="caption" tone="faint">
              Your 10/10/10 notes:{' '}
              {[e.reflection.ten_minutes, e.reflection.ten_months, e.reflection.ten_years].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {e.checkin_due ? <Checkin entry={e} /> : null}
        </Pressable>
      ))}
    </Screen>
  );
}
