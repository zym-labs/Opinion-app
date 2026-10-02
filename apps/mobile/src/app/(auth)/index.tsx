// A-02 Welcome + A-03 Sign in (STAGE1 §2).
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { signInWithApple, signInWithGoogle } from '@/lib/auth';
import { radius, space, useColors } from '@/theme';

function isCancel(e: unknown) {
  const code = (e as { code?: string })?.code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED';
}

export default function SignIn() {
  const c = useColors();
  const scheme = useColorScheme();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(method: 'apple' | 'google', fn: () => Promise<unknown>) {
    setError(null);
    setBusy(method);
    track('signin_started', { method });
    try {
      const result = await fn();
      if (result !== false) track('signin_completed', { method });
    } catch (e) {
      if (!isCancel(e)) {
        track('signin_failed', { method });
        setError('Sign-in didn’t work. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen style={{ justifyContent: 'space-between' }}>
      <View style={{ gap: space[6], paddingTop: space[16] }}>
        <View style={{ flexDirection: 'row' }} accessible={false}>
          <View style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: c.optionA }} />
          <View
            style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: c.optionB, marginLeft: -14 }}
          />
        </View>
        <Text variant="display">opinion</Text>
        <View style={{ gap: space[3] }}>
          <Text variant="question">Ask two options. Get real reasons.</Text>
          <Text tone="muted">
            Post a quick poll to people who know the topic, hear why they chose, and get an AI summary when
            it closes.
          </Text>
          <Text tone="muted">Your votes and reasons stay private. No followers, no likes.</Text>
        </View>
      </View>

      <View style={{ gap: space[3] }}>
        {error ? <Banner tone="danger" message={error} /> : null}
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              scheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius.md}
            style={{ height: 48 }}
            onPress={() => run('apple', signInWithApple)}
          />
        ) : null}
        <Button
          label="Continue with Google"
          variant="secondary"
          loading={busy === 'google'}
          disabled={busy !== null}
          onPress={() => run('google', signInWithGoogle)}
        />
        <Button
          label="Continue with email"
          variant="ghost"
          disabled={busy !== null}
          onPress={() => router.push('/email')}
        />
        <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          Opinion is for people 18 and over.
        </Text>
      </View>
    </Screen>
  );
}
