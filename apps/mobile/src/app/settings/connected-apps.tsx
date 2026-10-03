// Connected apps: AI assistants (ChatGPT, Claude…) you allowed to post polls for you and read your results.
// Disconnecting revokes their access immediately.
import { useQuery } from '@tanstack/react-query';
import { Alert, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { radius, space, useColors } from '@/theme';

type Grant = { client: { id: string; name: string; uri: string }; scopes: string[]; granted_at: string };

export default function ConnectedApps() {
  const c = useColors();
  const q = useQuery({
    queryKey: ['oauth-grants'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.oauth.listGrants();
      if (error) throw error;
      return (data ?? []) as Grant[];
    },
  });

  function disconnect(g: Grant) {
    Alert.alert(`Disconnect ${g.client.name}?`, 'It will no longer be able to post polls for you or see your results.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.oauth.revokeGrant({ clientId: g.client.id }).catch(() => {});
          q.refetch();
        },
      },
    ]);
  }

  if (q.isLoading) return <Screen><ScreenSkeleton /></Screen>;
  if (!q.data?.length) {
    return (
      <Screen>
        <EmptyState
          title="No connected apps"
          body="You can connect AI assistants like ChatGPT or Claude so they can ask real people on Opinion for you. They’ll always ask you before posting."
        />
      </Screen>
    );
  }
  return (
    <Screen onRefresh={() => q.refetch()}>
      {q.data.map((g) => (
        <View key={g.client.id} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
          <Text variant="bodyStrong">{g.client.name}</Text>
          <Text variant="caption" tone="faint">
            Connected {new Date(g.granted_at).toLocaleDateString()}
            {g.client.uri ? ` · ${g.client.uri.replace(/^https?:\/\//, '')}` : ''}
          </Text>
          <Text tone="muted">Can post polls for you (after asking) and read your polls’ results. Never sees how anyone voted.</Text>
          <Button label="Disconnect" variant="danger" onPress={() => disconnect(g)} />
        </View>
      ))}
    </Screen>
  );
}
