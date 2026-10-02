// P-01 Profile (owner only). Stats arrive in Phase 6.
import { useState } from 'react';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { signOut } from '@/lib/auth';

export default function Profile() {
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">Profile</Text>
      <Banner tone="privacy" message="Only you can see your profile." />
      <Button label="Sign out" variant="secondary" loading={busy} onPress={onSignOut} />
    </Screen>
  );
}
