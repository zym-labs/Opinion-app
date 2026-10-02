// S-01 Settings.
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { signOut } from '@/lib/auth';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/lib/legal';

export default function Settings() {
  return (
    <Screen>
      <Button label="Categories" variant="secondary" onPress={() => router.push('/settings/categories')} />
      <Button label="Communities" variant="secondary" onPress={() => router.push('/settings/communities')} />
      <Button label="Notifications" variant="secondary" onPress={() => router.push('/settings/notifications')} />
      <Button label="Hidden creators" variant="secondary" onPress={() => router.push('/settings/hidden')} />
      <Button label="Help & contact" variant="ghost" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      <Button label="Terms" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)} />
      <Button label="Privacy" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)} />
      <Button label="Community guidelines" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.guidelines)} />
      <Button label="Sign out" variant="secondary" onPress={signOut} />
      <Button label="Delete account" variant="danger" onPress={() => router.push('/settings/delete')} />
    </Screen>
  );
}
