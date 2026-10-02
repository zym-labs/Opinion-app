import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="categories" options={{ title: 'Categories' }} />
      <Stack.Screen name="communities" options={{ title: 'Communities' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="hidden" options={{ title: 'Hidden creators' }} />
      <Stack.Screen name="experts" options={{ title: 'Verify expertise' }} />
      <Stack.Screen name="email" options={{ title: 'Sign-in email' }} />
      <Stack.Screen name="delete" options={{ title: 'Delete account' }} />
    </Stack>
  );
}
