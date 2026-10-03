// Room mode: join, vote, and (for the host) show the QR code and reveal. Polls the state every 2 seconds
// while open; rooms are small and short-lived, so this is simpler than realtime.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { OptionTile } from '@/components/poll/option-tile';
import { SplitBar } from '@/components/poll/split-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { errorMessage, rpc } from '@/lib/api';
import { parkLink, roomLink } from '@/lib/links';
import { useMe } from '@/lib/queries';
import { useSession } from '@/lib/session';
import type { Side } from '@/lib/types';
import { palette, radius, space, useColors } from '@/theme';

type Room = {
  code: string;
  question: string;
  labels: string[];
  is_host: boolean;
  people: number;
  votes: number;
  my_side: number | null;
  revealed: boolean;
  expired: boolean;
  counts: number[] | null;
};

const SIDES: Side[] = ['a', 'b', 'c', 'd'];

export default function RoomScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const c = useColors();
  const qc = useQueryClient();
  const { session, loading } = useSession();
  const me = useMe();
  const onboarded = me.data?.onboarding_step === 'complete' && me.data?.status === 'active';
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Not signed up yet: keep the link and come back after onboarding.
  useEffect(() => {
    if (loading || (session && me.isLoading) || !code) return;
    if (!onboarded) {
      parkLink({ kind: 'room', code }).then(() => router.replace('/'));
      return;
    }
    rpc('join_room', { p_code: code })
      .then(() => setJoined(true))
      .catch((e) => setError(errorMessage(e)));
  }, [loading, session, me.isLoading, onboarded, code]);

  const room = useQuery({
    queryKey: ['room', code],
    enabled: joined,
    queryFn: () => rpc<Room>('room_state', { p_code: code }),
    refetchInterval: (q) => (q.state.data?.revealed || q.state.data?.expired ? false : 2000),
  });

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      Haptics.selectionAsync();
      await qc.invalidateQueries({ queryKey: ['room', code] });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (error && !room.data) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <Text variant="title">Couldn’t open this room</Text>
        <Text tone="muted">{error}</Text>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }
  const r = room.data;
  if (!r) return <Screen><ScreenSkeleton /></Screen>;

  const total = r.counts?.reduce((a, b) => a + b, 0) ?? 0;
  const options = r.labels.map((label, i) => ({ side: SIDES[i], label, image_path: null }));

  return (
    <Screen>
      <Text variant="question">{r.question}</Text>
      <Text tone="muted">
        {r.people} here · {r.votes} voted{r.expired ? ' · closed' : ''}
      </Text>

      {r.is_host && !r.revealed ? (
        <View style={{ alignItems: 'center', gap: space[2], padding: space[4], borderRadius: radius.lg, backgroundColor: palette.light.bg }}>
          <QRCode value={roomLink(r.code)} size={200} backgroundColor={palette.light.bg} color={palette.light.text} />
          <Text variant="title" style={{ color: palette.light.text, letterSpacing: 4 }}>
            {r.code}
          </Text>
          <Text variant="caption" style={{ color: palette.light.textMuted }}>
            Scan with the camera, or open Opinion → Profile → Join a room
          </Text>
        </View>
      ) : null}

      {r.revealed ? (
        r.counts ? (
          <View style={{ gap: space[3] }}>
            {options.map((o, i) => (
              <View key={o.side} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant={r.counts![i] === Math.max(...r.counts!) ? 'bodyStrong' : 'body'}>{o.label}</Text>
                <Text variant="title">{total ? Math.round((100 * r.counts![i]) / total) : 0}%</Text>
              </View>
            ))}
            <SplitBar segments={options.map((o, i) => ({ side: o.side, pct: total ? (100 * r.counts![i]) / total : 0 }))} />
          </View>
        ) : (
          <Banner message="Fewer than 3 people voted, so the result stays hidden to protect everyone’s vote." />
        )
      ) : r.my_side ? (
        <Banner message={`You voted. ${r.is_host ? 'Reveal when everyone’s in.' : 'Waiting for the host to reveal.'}`} />
      ) : !r.expired ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }} accessibilityRole="radiogroup">
          {options.map((o, i) => (
            <OptionTile key={o.side} option={o} selected={false} onPress={() => act(() => rpc('vote_room', { p_code: r.code, p_side: i + 1 }))} />
          ))}
        </View>
      ) : null}

      {r.is_host && !r.revealed && !r.expired ? (
        <Button label={`Reveal result (${r.votes} votes)`} disabled={r.votes < 1} onPress={() => act(() => rpc('reveal_room', { p_code: r.code }))} />
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      <Text variant="caption" tone="faint" style={{ color: c.textFaint }}>
        Votes in a room are anonymous and disappear a day after it closes.
      </Text>
    </Screen>
  );
}
