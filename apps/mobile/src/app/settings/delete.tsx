// S-07 Delete account (STAGE2 §7).
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { callFunction, errorMessage } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { space } from '@/theme';

export default function DeleteAccount() {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    try {
      await callFunction('account', undefined, { method: 'DELETE' });
      await signOut();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">Delete your account</Text>
      <View style={{ gap: space[2] }}>
        <Text>• Your active polls are removed.</Text>
        <Text>• Your past votes stay in results anonymously, no longer linked to you.</Text>
        <Text>• Your profile, categories, communities and settings are deleted.</Text>
        <Text>• This can’t be undone.</Text>
      </View>
      <TextField label="Type DELETE to confirm" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Delete my account" variant="danger" disabled={confirm !== 'DELETE'} loading={busy} onPress={remove} />
    </Screen>
  );
}
