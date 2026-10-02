// S-07 Moderation decisions and appeals.
import { AppealsList } from '@/components/appeals-list';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function Appeals() {
  return (
    <Screen>
      <Text tone="muted">
        If you think a moderator got it wrong, you can appeal each decision once, within 6 months. A different
        moderator reviews it and you will get a notification with the outcome.
      </Text>
      <AppealsList />
    </Screen>
  );
}
