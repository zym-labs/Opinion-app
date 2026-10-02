// A-04 Email code sign-in (STAGE2 §1): 6-digit code, resend after 60s.
import { emailSchema, otpCodeSchema } from '@opinion/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { track } from '@/lib/analytics';
import { sendEmailCode, verifyEmailCode } from '@/lib/auth';
import { space } from '@/theme';

const RESEND_SECONDS = 60;

export default function EmailSignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send() {
    const parsed = emailSchema.safeParse(email.trim().toLowerCase());
    if (!parsed.success) return setError('Enter a valid email address.');
    setError(null);
    setBusy(true);
    track('signin_started', { method: 'email' });
    try {
      await sendEmailCode(parsed.data);
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch {
      setError('We couldn’t send a code. Wait a minute and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const parsed = otpCodeSchema.safeParse(code.trim());
    if (!parsed.success) return setError('Enter the 6-digit code.');
    setError(null);
    setBusy(true);
    try {
      await verifyEmailCode(email.trim().toLowerCase(), parsed.data);
      track('signin_completed', { method: 'email' });
    } catch {
      track('signin_failed', { method: 'email' });
      setError('That code is wrong or has expired.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Button label="Back" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text variant="title">{step === 'email' ? 'Continue with email' : 'Check your inbox'}</Text>
      {step === 'email' ? (
        <View style={{ gap: space[4] }}>
          <Text tone="muted">We’ll email you a 6-digit code. No password needed.</Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={send}
          />
          {error ? <Banner tone="danger" message={error} /> : null}
          <Button label="Send code" loading={busy} onPress={send} />
        </View>
      ) : (
        <View style={{ gap: space[4] }}>
          <Text tone="muted">Enter the code we sent to {email}. It expires in 10 minutes.</Text>
          <TextField
            label="6-digit code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            onSubmitEditing={verify}
          />
          {error ? <Banner tone="danger" message={error} /> : null}
          <Button label="Sign in" loading={busy} onPress={verify} />
          <Button
            label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            variant="ghost"
            disabled={cooldown > 0 || busy}
            onPress={send}
          />
        </View>
      )}
    </Screen>
  );
}
