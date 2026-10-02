import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { rpc } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** A-11: asks permission and registers this device's Expo push token. Returns whether granted. */
export async function enablePush(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('No EAS projectId: run `eas init` (Phase 0) to enable push tokens');
    return true;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await rpc('register_device', { p_token: token, p_platform: Platform.OS });
  return true;
}

/** Opens the screen a tapped notification points at (push worker sets data.url). */
export function useNotificationRouting(enabled: boolean) {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = last?.notification.request.content.data?.url;
    if (enabled && typeof url === 'string') router.push(url as never);
  }, [enabled, last]);
}
