// A-08 Join communities (optional) → A-11 notifications → done.
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { CommunityList } from '@/components/community-list';
import { StepHeader } from '@/components/step-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { errorMessage, rpc } from '@/lib/api';
import { enablePush } from '@/lib/push';
import { keys } from '@/lib/queries';
import { space } from '@/theme';

export default function Communities() {
  const qc = useQueryClient();
  const [step, setStep] = useState<'communities' | 'notifications'>('communities');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(withPush: boolean) {
    setBusy(true);
    try {
      await rpc('complete_onboarding');
      track('onboarding_complete', {});
      const granted = withPush ? await enablePush().catch(() => false) : false;
      track('notif_permission', { granted });
      // The root layout switches to the tabs once onboarding is complete.
      await qc.invalidateQueries({ queryKey: keys.me });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (step === 'notifications') {
    return (
      <Screen>
        <StepHeader step={4} total={4} title="Know when results are in" />
        <View style={{ gap: space[2] }}>
          <Text>We’ll only tell you when:</Text>
          <Text>• a daily round-up of new polls for you is ready</Text>
          <Text>• a poll you voted on has closed</Text>
          <Text>• your own poll’s results are ready</Text>
          <Text>• your reason was featured</Text>
        </View>
        {error ? <Banner tone="danger" message={error} /> : null}
        <Button label="Turn on notifications" loading={busy} onPress={() => finish(true)} />
        <Button label="Not now" variant="ghost" disabled={busy} onPress={() => finish(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <StepHeader
        step={4}
        total={4}
        title="Join communities"
        body="Optional. Community polls only go to members. You can change this later in Settings."
      />
      <CommunityList />
      <Button label="Continue" onPress={() => setStep('notifications')} />
    </Screen>
  );
}
