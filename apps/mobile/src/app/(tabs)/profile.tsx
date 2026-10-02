// P-01 Profile (owner only).
import { router } from 'expo-router';
import { View } from 'react-native';

import { HeaderBar } from '@/components/header-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useStats } from '@/lib/queries';
import { radius, space, useColors } from '@/theme';

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.lg,
        padding: space[4],
        gap: space[1],
      }}>
      <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="label" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export default function Profile() {
  const { data: s } = useStats();
  return (
    <Screen>
      <HeaderBar title="Profile" />
      <Banner tone="privacy" message="Only you can see your profile." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
        <Stat label="Polls voted" value={String(s?.polls_voted ?? 0)} />
        <Stat label="Majority picks" value={s?.majority_pct != null ? `${s.majority_pct}%` : '—'} />
        <Stat label="Featured insights" value={String(s?.featured_count ?? 0)} />
        <Stat label="Polls available" value={String(s?.polls_available ?? 0)} />
      </View>
      {s?.top_categories.length ? (
        <View style={{ gap: space[1] }}>
          <Text variant="label" tone="muted">
            Top categories
          </Text>
          <Text>{s.top_categories.join(' · ')}</Text>
        </View>
      ) : null}
      <Button label="Featured insights" variant="secondary" onPress={() => router.push('/featured')} />
      <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Screen>
  );
}
