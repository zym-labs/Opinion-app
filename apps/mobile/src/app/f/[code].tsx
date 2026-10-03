// Close friends link: opinion.app/f/<code>. Joins the owner's circle, so their friends-only polls reach you.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { errorMessage, rpc } from '@/lib/api';
import { parkLink } from '@/lib/links';
import { useMe } from '@/lib/queries';
import { useSession } from '@/lib/session';

export default function CircleLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useSession();
  const me = useMe();
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = !loading && (!session || !me.isLoading);
  const onboarded = me.data?.onboarding_step === 'complete' && me.data?.status === 'active';

  useEffect(() => {
    if (!ready || !code) return;
    if (!onboarded) {
      parkLink({ kind: 'f', code }).then(() => router.replace('/'));
      return;
    }
    rpc('join_circle', { p_code: code })
      .then(() =>
        setState({
          ok: true,
          text: 'Their friends-only polls will now reach you. Votes stay anonymous, even between friends. You can leave any time in Profile → Close friends.',
        }),
      )
      .catch((e) => setState({ ok: false, text: errorMessage(e) }));
  }, [ready, onboarded, code]);

  if (!state) return <Screen><ScreenSkeleton /></Screen>;
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Text variant="title">{state.ok ? 'You’re in their close friends' : 'Couldn’t join'}</Text>
      <Text tone="muted">{state.text}</Text>
      <Button label="Go to feed" onPress={() => router.replace('/')} />
    </Screen>
  );
}
