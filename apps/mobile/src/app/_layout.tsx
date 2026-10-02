import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { initMonitoring } from '@/lib/analytics';
import { useNotificationRouting } from '@/lib/push';
import { useMe } from '@/lib/queries';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();
initMonitoring();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });

function RootNavigator() {
  const { session, loading } = useSession();
  const me = useMe();
  const signedIn = !!session;
  const ready = !loading && (!signedIn || !me.isLoading);
  const status = me.data?.status;
  const onboarded = me.data?.onboarding_step === 'complete' && status === 'active';
  useNotificationRouting(signedIn && onboarded);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && status === 'suspended'}>
        <Stack.Screen name="suspended" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && status !== 'suspended' && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="vote/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="result/[id]" options={{ headerShown: true, title: 'Result' }} />
        <Stack.Screen name="my-poll/[id]" options={{ headerShown: true, title: 'Your poll' }} />
        <Stack.Screen name="report" options={{ presentation: 'modal', headerShown: true, title: 'Report' }} />
        <Stack.Screen name="credits" options={{ presentation: 'modal', headerShown: true, title: 'Credits' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="featured" options={{ headerShown: true, title: 'Featured insights' }} />
        <Stack.Screen name="settings" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
