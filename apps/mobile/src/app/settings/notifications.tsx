// S-04 Notification preferences.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { errorMessage, rpc } from '@/lib/api';
import { enablePush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

type Prefs = {
  new_polls: boolean;
  poll_ended: boolean;
  summary_ready: boolean;
  insight_featured: boolean;
  digest_hour: number;
};

const ROWS: [keyof Omit<Prefs, 'digest_hour'>, string][] = [
  ['new_polls', 'Daily round-up of new polls'],
  ['poll_ended', 'A poll I voted on has closed'],
  ['summary_ready', 'My poll’s results are ready'],
  ['insight_featured', 'My reason was featured'],
];

const DEFAULTS: Prefs = { new_polls: true, poll_ended: true, summary_ready: true, insight_featured: true, digest_hour: 18 };

export default function NotificationSettings() {
  const q = useQuery({
    queryKey: ['prefs'],
    queryFn: async () => {
      const { data } = await supabase.from('notification_prefs').select('*').maybeSingle();
      return data as Prefs | null;
    },
  });
  if (q.isLoading) return <Screen><Text tone="muted">Loading…</Text></Screen>;
  return <PrefsForm initial={q.data ?? DEFAULTS} />;
}

function PrefsForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(next: Prefs) {
    setPrefs(next);
    try {
      await rpc('update_notification_prefs', {
        p_new_polls: next.new_polls,
        p_poll_ended: next.poll_ended,
        p_summary_ready: next.summary_ready,
        p_insight_featured: next.insight_featured,
        p_digest_hour: next.digest_hour,
        p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (e) {
      setMsg(errorMessage(e));
    }
  }

  return (
    <Screen>
      {ROWS.map(([key, label]) => (
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text style={{ flex: 1 }}>{label}</Text>
          <Switch accessibilityLabel={label} value={prefs[key]} onValueChange={(v) => save({ ...prefs, [key]: v })} />
        </View>
      ))}
      <Text variant="label" tone="muted">
        Round-up time
      </Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {[8, 12, 18, 21].map((h) => (
          <Chip key={h} label={`${h}:00`} selected={prefs.digest_hour === h} onPress={() => save({ ...prefs, digest_hour: h })} />
        ))}
      </View>
      {msg ? <Banner message={msg} /> : null}
      <Button
        label="Turn on push notifications"
        variant="secondary"
        onPress={async () =>
          setMsg((await enablePush()) ? 'Push notifications are on.' : 'Allow notifications in your phone’s settings.')
        }
      />
    </Screen>
  );
}
