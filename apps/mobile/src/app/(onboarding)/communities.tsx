// A-08 Join communities (optional) → done. Notifications are asked for after the first vote,
// when there's a concrete reason (a result to wait for).
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { CommunityList } from '@/components/community-list';
import { StepHeader } from '@/components/step-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { track } from '@/lib/analytics';
import { errorMessage, rpc } from '@/lib/api';
import { keys } from '@/lib/queries';

export default function Communities() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setBusy(true);
    try {
      await rpc('complete_onboarding');
      track('onboarding_complete', {});
      // The root layout switches to the tabs once onboarding is complete.
      await qc.invalidateQueries({ queryKey: keys.me });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
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
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Continue" loading={busy} onPress={finish} />
    </Screen>
  );
}
