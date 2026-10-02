// Asks for notifications right after the first vote, when there's a concrete reason ("your result").
// Asked once; Settings → Notifications can turn them on later.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { enablePush } from '@/lib/push';
import { radius, space, useColors } from '@/theme';

const ASKED = 'push-asked';

export function PushPrompt() {
  const c = useColors();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Promise.all([Notifications.getPermissionsAsync(), AsyncStorage.getItem(ASKED)])
      .then(([perm, asked]) => setShow(perm.status === 'undetermined' && !asked))
      .catch(() => {});
  }, []);
  if (!show) return null;

  async function answer(yes: boolean) {
    setShow(false);
    AsyncStorage.setItem(ASKED, '1').catch(() => {});
    const granted = yes ? await enablePush().catch(() => false) : false;
    track('notif_permission', { granted });
  }

  return (
    <View style={{ backgroundColor: c.surfaceMuted, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
      <Text variant="bodyStrong">Want to know when your result is in?</Text>
      <Text tone="muted">We’ll tell you when polls you voted on close. No more than a few nudges a week.</Text>
      <Button label="Notify me" onPress={() => answer(true)} />
      <Button label="Not now" variant="ghost" onPress={() => answer(false)} />
    </View>
  );
}
