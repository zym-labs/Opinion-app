// Friend invite link: opinion.app/i/<code>. Records the referral (new accounts only), then opens the feed.
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

export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useSession();
  const me = useMe();
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = !loading && (!session || !me.isLoading);
  const onboarded = me.data?.onboarding_step === 'complete' && me.data?.status === 'active';

  useEffect(() => {
    if (!ready || !code) return;
    if (!onboarded) {
      parkLink({ kind: 'i', code }).then(() => router.replace('/'));
      return;
    }
    rpc('redeem_referral', { p_code: code })
      .then(() => setState({ ok: true, text: 'Vote on 3 polls and you and your friend each get a free poll.' }))
      .catch((e) => setState({ ok: false, text: errorMessage(e) }));
  }, [ready, onboarded, code]);

  if (!state) return <Screen><ScreenSkeleton /></Screen>;
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Text variant="title">{state.ok ? 'Invite accepted' : 'Couldn’t use this invite'}</Text>
      <Text tone="muted">{state.text}</Text>
      <Button label="Go to feed" onPress={() => router.replace('/')} />
    </Screen>
  );
}
