// M-01 My Polls. History arrives in Phase 3/5.
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function MyPolls() {
  return (
    <Screen>
      <Text variant="title">My Polls</Text>
      <EmptyState title="No polls yet" body="Polls you create will be kept here, with their results." />
    </Screen>
  );
}
