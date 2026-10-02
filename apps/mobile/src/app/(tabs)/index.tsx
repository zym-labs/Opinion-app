// F-01 Feed. Polls arrive in Phase 4.
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function Feed() {
  return (
    <Screen>
      <Text variant="title">Feed</Text>
      <EmptyState title="No open polls yet" body="Polls matching your interests will show up here." />
    </Screen>
  );
}
