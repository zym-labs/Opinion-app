// "What Opinion knows about me": everything we hold, in plain words and counts, with the controls next to it.
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { radius, space, useColors } from '@/theme';

type Summary = {
  joined: string;
  birth_year_stored: boolean;
  locale: string;
  last_active: string;
  topics: number;
  communities: number;
  polls: number;
  votes: number;
  reasons: number;
  notifications: number;
  devices: number;
  campus_verified: boolean;
  expert_verified: boolean;
  circle_members: number;
  sponsored_opt_in: boolean;
  plus: boolean;
};

function Row({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: space[1] }}>
      <Text variant="bodyStrong">{title}</Text>
      <Text tone="muted">{body}</Text>
    </View>
  );
}

export default function PrivacyDashboard() {
  const c = useColors();
  const q = useQuery({ queryKey: ['my-data'], queryFn: () => rpc<Summary>('my_data_summary') });
  const d = q.data;
  if (!d) return <Screen><ScreenSkeleton lines={8} /></Screen>;
  return (
    <Screen>
      <View style={{ backgroundColor: c.surfaceMuted, borderRadius: radius.lg, padding: space[4], gap: space[1] }}>
        <Text variant="bodyStrong">What nobody else can see</Text>
        <Text tone="muted">
          Nobody, including the people you ask, ever sees who voted or what you picked. We never sell data and show no
          ads.
        </Text>
      </View>
      <Row title="Account" body={`Since ${new Date(d.joined).toLocaleDateString()}. Your sign-in email and an internal ID. Last active ${new Date(d.last_active).toLocaleDateString()}.`} />
      <Row title="Age" body={d.birth_year_stored ? 'Your birth year only, to keep Opinion 18+ and for age-targeted polls.' : 'Not stored.'} />
      <Row title="Interests" body={`${d.topics} topics and ${d.communities} communities you chose, to show you the right polls.`} />
      <Row title="Your activity" body={`${d.polls} polls asked, ${d.votes} votes and ${d.reasons} written reasons. Reasons are only ever shown anonymously, and only if you agreed.`} />
      <Row title="Notifications" body={`${d.notifications} kept. Notifications are deleted after 60 days.`} />
      <Row title="Devices" body={`${d.devices} app integrity key${d.devices === 1 ? '' : 's'} to stop fake accounts. No location, contacts or advertising ID.`} />
      <Row
        title="Verifications"
        body={[
          d.campus_verified ? 'Campus email verified (only a scrambled version is stored).' : null,
          d.expert_verified ? 'Expertise verified (only a scrambled version of the email is stored).' : null,
        ]
          .filter(Boolean)
          .join(' ') || 'None.'}
      />
      <Row title="Close friends" body={`${d.circle_members} in your circle. You see a count, never names.`} />
      <Row title="Sponsored questions" body={d.sponsored_opt_in ? 'On (Settings → Notifications).' : 'Off.'} />
      <Row title="Language" body={`${d.locale}, so AI summaries come back in your language.`} />
      <Button label="Download all my data" variant="secondary" onPress={() => router.push('/settings')} />
      <Button label="Delete account" variant="danger" onPress={() => router.push('/settings/delete')} />
    </Screen>
  );
}
