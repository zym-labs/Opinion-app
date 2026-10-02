// A-09 Account suspended.
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { signOut } from '@/lib/auth';

export default function Suspended() {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Text variant="title">Your account is suspended</Text>
      <Text tone="muted">
        Your account broke the community guidelines. If you think this is a mistake, contact support from our website.
      </Text>
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
