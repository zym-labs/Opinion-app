// C-01 Create. Poll creation arrives in Phase 3.
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function Create() {
  return (
    <Screen>
      <Text variant="title">Create</Text>
      <EmptyState title="Ask a question" body="Creating polls is coming soon." />
    </Screen>
  );
}
