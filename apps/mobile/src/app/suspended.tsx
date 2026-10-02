// A-09 Account suspended. Suspended accounts can still appeal.
import { AppealsList } from '@/components/appeals-list';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { signOut } from '@/lib/auth';

export default function Suspended() {
  return (
    <Screen>
      <Text variant="title">Your account is suspended</Text>
      <Text tone="muted">Your account broke the community guidelines. If you think this is a mistake, appeal below.</Text>
      <AppealsList />
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
