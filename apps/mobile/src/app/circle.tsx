// Close friends: up to 20 people who get your friends-only polls automatically. You see how many,
// never who, and votes stay anonymous between friends too.
import { useQuery } from '@tanstack/react-query';
import { Alert, Share } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { rpc } from '@/lib/api';
import { circleLink } from '@/lib/links';

type Circle = { code: string; members: number; member_of: number };

export default function CloseFriends() {
  const q = useQuery({ queryKey: ['circle'], queryFn: async () => (await rpc<Circle[]>('my_circle'))[0] });
  if (q.isLoading || !q.data) return <Screen><ScreenSkeleton /></Screen>;
  const c = q.data;

  function confirm(title: string, body: string, action: () => Promise<unknown>) {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: () => action().then(() => q.refetch()).catch(() => {}) },
    ]);
  }

  return (
    <Screen onRefresh={() => q.refetch()}>
      <Text variant="display">{c.members}/20</Text>
      <Text variant="question">{c.members === 1 ? 'friend in your circle' : 'friends in your circle'}</Text>
      <Text tone="muted">
        When you publish to friends only, your circle gets it straight away. Use it for quick group calls: where to eat,
        which plan, which outfit. You see how many friends are in it, never who, and votes stay anonymous.
      </Text>
      <Button
        label="Share your circle link"
        disabled={c.members >= 20}
        onPress={() => {
          track('circle_shared', {});
          const url = circleLink(c.code);
          Share.share({ message: `Join my close friends on Opinion so you get my quick questions: ${url}`, url }).catch(() => {});
        }}
      />
      <Button
        label="New link (old one stops working)"
        variant="secondary"
        onPress={() => confirm('Make a new link?', 'Your current link will stop working. Friends already in stay.', () => rpc('reset_circle', { p_remove_members: false }))}
      />
      {c.members ? (
        <Button
          label="Remove everyone"
          variant="ghost"
          onPress={() => confirm('Empty your circle?', 'Everyone is removed and your link changes.', () => rpc('reset_circle', { p_remove_members: true }))}
        />
      ) : null}
      {c.member_of ? (
        <>
          <Text tone="muted">You’re in {c.member_of} {c.member_of === 1 ? 'friend’s circle' : 'friends’ circles'}.</Text>
          <Button
            label="Leave all circles"
            variant="ghost"
            onPress={() => confirm('Leave all circles?', 'You’ll stop getting friends-only polls from them.', () => rpc('leave_circles'))}
          />
        </>
      ) : null}
    </Screen>
  );
}
