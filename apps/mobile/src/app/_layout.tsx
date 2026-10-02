import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { identify, initMonitoring } from '@/lib/analytics';
import { signOut } from '@/lib/auth';
import { ensureAttested } from '@/lib/integrity';
import { persister, shouldPersist } from '@/lib/offline';
import { useNotificationRouting } from '@/lib/push';
import { useMe } from '@/lib/queries';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();
initMonitoring();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, gcTime: 24 * 60 * 60_000 } },
});

function RootNavigator() {
  const { session, loading } = useSession();
  const me = useMe();
  const signedIn = !!session;
  const ready = !loading && (!signedIn || !me.isLoading);
  const status = me.data?.status;
  const onboarded = me.data?.onboarding_step === 'complete' && status === 'active';
  useNotificationRouting(signedIn && onboarded);

  // Register this device for integrity checks once the user is onboarded (best effort, in the background).
  const userId = session?.user.id;
  useEffect(() => {
    if (userId && onboarded) ensureAttested(userId);
  }, [userId, onboarded]);
  useEffect(() => identify(userId ?? null), [userId]);

  // An interrupted account deletion leaves status 'deleted': sign out instead of re-entering onboarding.
  useEffect(() => {
    if (status === 'deleted') signOut();
  }, [status]);

  // Nothing from one account may stay on the device after sign-out.
  useEffect(() => {
    if (!loading && !signedIn) queryClient.clear();
  }, [loading, signedIn]);

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
        <Stack.Screen name="how-ai-works" options={{ presentation: 'modal', headerShown: true, title: '' }} />
        <Stack.Screen name="credits" options={{ presentation: 'modal', headerShown: true, title: 'Credits' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="featured" options={{ headerShown: true, title: 'Featured insights' }} />
        <Stack.Screen name="appeals" options={{ headerShown: true, title: 'Appeals' }} />
        <Stack.Screen name="settings" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <Providers>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </ThemeProvider>
    </Providers>
  );
}

function Providers({ children }: { children: ReactNode }) {
  if (!persister) return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60_000, dehydrateOptions: { shouldDehydrateQuery: shouldPersist } }}>
      {children}
    </PersistQueryClientProvider>
  );
}
