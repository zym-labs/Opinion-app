// Opinion Wrapped: your year (or year so far) on Opinion, as a shareable 9:16 card. About helping others
// and your own decisions, never about how anyone voted.
import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { rpc } from '@/lib/api';
import { useStats } from '@/lib/queries';
import { palette, radius, space } from '@/theme';

type Impact = { votes: number; reasons_quoted: number; helpful_marks: number; askers_followed: number; predictions: number; predictions_right: number };

const c = palette.light;

export default function Wrapped() {
  const ref = useRef<View>(null);
  const impact = useQuery({ queryKey: ['impact-year'], queryFn: async () => (await rpc<Impact[]>('my_impact', { p_days: 365 }))[0] });
  const { data: stats } = useStats();
  const year = new Date().getFullYear();
  const i = impact.data;
  if (!i) return <Screen><ScreenSkeleton /></Screen>;
  const calibration = i.predictions >= 5 ? Math.round((100 * i.predictions_right) / i.predictions) : null;
  const persona =
    i.reasons_quoted >= 5 ? 'The Voice of Reason' : calibration && calibration >= 70 ? 'The Room Reader' : i.votes >= 100 ? 'The Reliable Friend' : i.votes >= 20 ? 'The Sounding Board' : 'Just Getting Started';

  return (
    <Screen>
      <View
        ref={ref}
        collapsable={false}
        style={{ alignSelf: 'center', width: 300, aspectRatio: 9 / 16, backgroundColor: c.bg, borderRadius: radius.xl, padding: space[6], gap: space[4], justifyContent: 'center' }}>
        <Text variant="label" style={{ color: c.textMuted }}>
          My {year} on Opinion
        </Text>
        <Text variant="title" style={{ color: c.text }}>
          {persona}
        </Text>
        <Text variant="display" style={{ color: c.optionA }}>
          {i.votes}
        </Text>
        <Text style={{ color: c.text }}>people helped to decide</Text>
        {i.reasons_quoted ? <Text style={{ color: c.text }}>{i.reasons_quoted} of my reasons quoted</Text> : null}
        {i.askers_followed ? <Text style={{ color: c.text }}>{i.askers_followed} askers went with my pick</Text> : null}
        {calibration !== null ? <Text style={{ color: c.text }}>I read the room {calibration}% of the time</Text> : null}
        {stats?.top_categories.length ? (
          <Text variant="label" style={{ color: c.textMuted }}>
            Most asked about: {stats.top_categories.slice(0, 3).join(' · ')}
          </Text>
        ) : null}
        <Text variant="caption" style={{ color: c.textMuted }}>
          Anonymous opinions, real reasons · Opinion
        </Text>
      </View>
      <Button
        label="Share my Wrapped"
        onPress={async () => {
          track('wrapped_shared', {});
          const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: 1080 });
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'My year on Opinion' });
        }}
      />
      <Text variant="caption" tone="faint">
        Only totals: never which polls you voted on or how.
      </Text>
    </Screen>
  );
}
