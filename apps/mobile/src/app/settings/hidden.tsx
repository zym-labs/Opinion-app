// S-05 Hidden creators (shown by the poll that caused the hide; creators stay anonymous).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { keys } from '@/lib/queries';
import { space } from '@/theme';

type Hidden = { source_poll_id: string; question: string; hidden_at: string };

export default function HiddenCreators() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['hidden'], queryFn: () => rpc<Hidden[]>('list_hidden_creators') });

  if (!q.isLoading && !q.data?.length) {
    return (
      <Screen>
        <EmptyState title="No hidden creators" body="Hide a creator from a poll’s Report menu to stop seeing their polls." />
      </Screen>
    );
  }
  return (
    <Screen>
      {q.data?.map((h) => (
        <View key={h.source_poll_id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text style={{ flex: 1 }}>Hidden creator · from “{h.question}”</Text>
          <Button
            label="Unhide"
            variant="secondary"
            onPress={async () => {
              await rpc('unhide_creator', { p_source_poll: h.source_poll_id });
              qc.invalidateQueries({ queryKey: ['hidden'] });
              qc.invalidateQueries({ queryKey: keys.feed });
            }}
          />
        </View>
      ))}
    </Screen>
  );
}
