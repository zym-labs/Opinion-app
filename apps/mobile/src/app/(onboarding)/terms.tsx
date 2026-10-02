// A-06 Terms, privacy and guidelines.
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { StepHeader } from '@/components/step-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { errorMessage, rpc } from '@/lib/api';
import { LEGAL_URLS, TERMS_VERSION } from '@/lib/legal';
import { keys } from '@/lib/queries';
import { space } from '@/theme';

const POINTS = [
  'Your votes, reasons and identity are never shown to other people.',
  'If you agree when voting, your reason may appear as an anonymous quote.',
  'AI writes the summaries. They’re labelled and can be wrong — results are opinions, not professional advice.',
  'No harassment, hate, personal information or content about private people.',
];

export default function Terms() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    try {
      await rpc('accept_terms', { p_version: TERMS_VERSION });
      await qc.invalidateQueries({ queryKey: keys.me });
      router.replace('/categories');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <StepHeader step={2} total={4} title="How Opinion works" />
      <View style={{ gap: space[3] }}>
        {POINTS.map((p) => (
          <Text key={p}>• {p}</Text>
        ))}
      </View>
      <View style={{ gap: space[1] }}>
        <Button label="Terms of service" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)} />
        <Button label="Privacy policy" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)} />
        <Button label="Community guidelines" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.guidelines)} />
      </View>
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="I agree" loading={busy} onPress={accept} />
    </Screen>
  );
}
