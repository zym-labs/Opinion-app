// S-01 Settings.
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { track } from '@/lib/analytics';
import { errorMessage } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { exportMyData } from '@/lib/data-export';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/lib/legal';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setExporting(true);
    setError(null);
    try {
      await exportMyData();
      track('data_exported', {});
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen>
      <Button label="Categories" variant="secondary" onPress={() => router.push('/settings/categories')} />
      <Button label="Communities" variant="secondary" onPress={() => router.push('/settings/communities')} />
      <Button label="Notifications" variant="secondary" onPress={() => router.push('/settings/notifications')} />
      <Button label="Hidden creators" variant="secondary" onPress={() => router.push('/settings/hidden')} />
      <Button label="Verify expertise" variant="secondary" onPress={() => router.push('/settings/experts')} />
      <Button label="Sign-in email" variant="secondary" onPress={() => router.push('/settings/email')} />
      <Button label="Moderation & appeals" variant="secondary" onPress={() => router.push('/appeals')} />
      <Button label="Connected apps" variant="secondary" onPress={() => router.push('/settings/connected-apps')} />
      <Button label="What Opinion knows about me" variant="secondary" onPress={() => router.push('/settings/privacy')} />
      <Button label="Download my data" variant="secondary" loading={exporting} onPress={download} />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Help & contact" variant="ghost" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      <Button label="Terms" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)} />
      <Button label="Privacy" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)} />
      <Button label="Community guidelines" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.guidelines)} />
      <Button label="Sign out" variant="secondary" onPress={signOut} />
      <Button label="Delete account" variant="danger" onPress={() => router.push('/settings/delete')} />
    </Screen>
  );
}
