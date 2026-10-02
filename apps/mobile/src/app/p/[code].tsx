// Friend vote link: opinion.app/p/<code>. Adds you to the poll's invitees, then opens the vote screen.
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

export default function PollLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useSession();
  const me = useMe();
  const [error, setError] = useState<string | null>(null);
  const ready = !loading && (!session || !me.isLoading);
  const onboarded = me.data?.onboarding_step === 'complete' && me.data?.status === 'active';

  useEffect(() => {
    if (!ready || !code) return;
    if (!onboarded) {
      // Sign up first; the link is followed afterwards.
      parkLink({ kind: 'p', code }).then(() => router.replace('/'));
      return;
    }
    rpc<string>('claim_poll_invite', { p_code: code })
      .then((id) => router.replace({ pathname: '/vote/[id]', params: { id } }))
      .catch((e) => setError(errorMessage(e)));
  }, [ready, onboarded, code]);

  return (
    <Screen>
      {error ? (
        <>
          <Text variant="title">This poll isn’t open</Text>
          <Text tone="muted">{error}</Text>
          <Button label="Go to feed" onPress={() => router.replace('/')} />
        </>
      ) : (
        <ScreenSkeleton />
      )}
    </Screen>
  );
}
