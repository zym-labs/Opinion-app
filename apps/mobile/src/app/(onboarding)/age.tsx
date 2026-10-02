// A-05 Age gate: birth year only (STAGE2 §4).
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { StepHeader } from '@/components/step-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ApiError, callFunction, errorMessage } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { clearPendingBirthYear, getPendingBirthYear } from '@/lib/pending-age';
import { keys } from '@/lib/queries';
import { space } from '@/theme';

export default function Age() {
  const qc = useQueryClient();
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  // A birth year given in the try flow is submitted automatically, so nobody is asked twice.
  const autoTried = useRef(false);
  useEffect(() => {
    getPendingBirthYear().then((y) => {
      if (y && !autoTried.current) {
        autoTried.current = true;
        submit(String(y));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  async function submit(value: string = year) {
    setYear(value);
    const y = Number(value);
    const now = new Date().getFullYear();
    if (!/^\d{4}$/.test(value) || y < 1900 || y > now) return setError('Enter the year you were born, e.g. 2001.');
    setError(null);
    setBusy(true);
    try {
      // TODO(Phase 2 native module): pass the App Store / Play age-range signal as store_says_adult.
      await callFunction('onboarding-age', { birth_year: y });
      clearPendingBirthYear();
      await qc.invalidateQueries({ queryKey: keys.me });
      router.replace('/terms');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'AGE_BLOCKED') setBlocked(true);
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (blocked) {
    // A-10 Not eligible: the account has already been deleted on the server.
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <StepHeader step={1} total={4} title="Opinion is 18+" body="Sorry, you need to be 18 or older to use Opinion. We haven’t kept your account." />
        <Button label="OK" onPress={signOut} />
      </Screen>
    );
  }

  return (
    <Screen>
      <StepHeader
        step={1}
        total={4}
        title="What year were you born?"
        body="Opinion is for adults. We only store your birth year, to check you’re 18+ and to match age-targeted polls."
      />
      <View style={{ gap: space[4] }}>
        <TextField
          label="Birth year"
          value={year}
          onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          placeholder="YYYY"
          onSubmitEditing={() => submit()}
        />
        {error ? <Banner tone="danger" message={error} /> : null}
        <Button label="Continue" loading={busy} onPress={() => submit()} />
      </View>
    </Screen>
  );
}
