// P-01 Profile (owner only): private mastery signals in a small bento grid (STAGE6 v2 P2).
// No public counts, no comparisons with other people.
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { HeaderBar } from '@/components/header-bar';
import { InviteCard } from '@/components/invite-card';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { useStats } from '@/lib/queries';
import { radius, space, useColors } from '@/theme';

function Tile({ value, label, detail, wide, accent }: {
  value: string;
  label: string;
  detail?: string;
  wide?: boolean;
  accent?: string;
}) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ''}`}
      style={{
        flexBasis: wide ? '100%' : '47%',
        flexGrow: 1,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.lg,
        padding: space[4],
        gap: space[1],
      }}>
      <Text variant={wide ? 'display' : 'title'} style={{ fontVariant: ['tabular-nums'], color: accent ?? c.text }}>
        {value}
      </Text>
      <Text variant="label">{label}</Text>
      {detail ? (
        <Text variant="caption" tone="faint">
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export default function Profile() {
  const c = useColors();
  const { data: s } = useStats();
  const decided = s?.decided ?? 0;
  // Private standing: never shown to anyone else. Trusted voters' reports are looked at first.
  const rep = useQuery({
    queryKey: ['reputation'],
    queryFn: async () => (await rpc<{ score: number; trusted: boolean; helpful: number }[]>('my_reputation'))[0],
  });

  return (
    <Screen>
      <HeaderBar title="Profile" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Lock size={14} strokeWidth={1.75} color={c.textMuted} />
        <Text variant="label" tone="muted">
          Only you can see this page.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
        <Tile
          wide
          value={decided ? `${s!.majority_matches} of ${decided}` : '—'}
          label="Times you matched the majority"
          detail={decided ? undefined : 'Shows up once polls you voted on have closed.'}
          accent={c.optionA}
        />
        <Tile
          value={String(s?.contrarian_picks ?? 0)}
          label="Contrarian picks"
          detail="You saw it differently from most"
          accent={c.optionBText}
        />
        <Tile
          value={s?.predictions_made ? `${s.predictions_right}/${s.predictions_made}` : '—'}
          label="Predictions right"
          detail="“What will most people pick?”"
        />
        <Tile value={String(s?.featured_count ?? 0)} label="Reasons quoted" detail="Featured in a result" accent={c.ai} />
        <Tile
          value={String(s?.decision_matches ?? 0)}
          label="Askers went with your pick"
          detail="When they shared their decision"
        />
        <Tile
          value={s?.week_streak ? `${s.week_streak} wk` : '—'}
          label="Weekly streak"
          detail={`${Math.min(s?.week_votes ?? 0, 3)}/3 votes this week · one missed week is forgiven`}
        />
        <Tile value={String(s?.polls_voted ?? 0)} label="Polls voted" />
        <Tile
          wide
          value={String(s?.polls_available ?? 0)}
          label={s?.polls_available === 1 ? 'Poll you can post' : 'Polls you can post'}
          detail={`Give 3 opinions, get 1 ask · ${(s?.credits ?? 0) % 3}/3 towards the next`}
        />
      </View>

      {rep.data?.trusted ? (
        <Text variant="label" tone="muted">
          Trusted voter: your quoted reasons and good calls mean your reports are looked at first. Only you see this.
        </Text>
      ) : rep.data?.helpful ? (
        <Text variant="label" tone="muted">
          Your quoted reasons helped {rep.data.helpful} {rep.data.helpful === 1 ? 'person' : 'people'} decide.
        </Text>
      ) : null}
      {s?.top_categories.length ? (
        <View style={{ gap: space[1] }}>
          <Text variant="label" tone="muted">
            You vote most on
          </Text>
          <Text>{s.top_categories.join(' · ')}</Text>
        </View>
      ) : null}
      <Button label="Decision journal" onPress={() => router.push('/journal')} />
      <Button label="Close friends" variant="secondary" onPress={() => router.push('/circle')} />
      <Button label="Opinion+" variant="secondary" onPress={() => router.push('/plus')} />
      <InviteCard />
      <Button label="Your quoted reasons" variant="secondary" onPress={() => router.push('/featured')} />
      <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Screen>
  );
}
