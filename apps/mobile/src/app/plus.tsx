// Opinion+ paywall. Shown only from Profile and Credits, never before someone has seen a result.
// Perks never buy influence over other people's answers: no extra votes, no live results.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { errorMessage } from '@/lib/api';
import { LEGAL_URLS } from '@/lib/legal';
import { buy, ensurePurchases, getPlusPackages, purchasesAvailable, restore } from '@/lib/purchases';
import { usePlus } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { space } from '@/theme';


const PERKS = [
  ['2 free boosts every month', 'Ask 50 more people in your audience, without spending credits.'],
  ['Polls up to 48 hours', 'More time for bigger decisions.'],
  ['Export your decision journal', 'Keep your decisions and how they turned out.'],
  ['Keep Opinion independent', 'No ads, no selling data. Members pay for the servers and the AI.'],
] as const;

export default function OpinionPlus() {
  const qc = useQueryClient();
  const { session } = useSession();
  const plus = usePlus();
  const userId = session?.user.id;
  const packages = useQuery({
    queryKey: ['plus-packages', userId],
    enabled: purchasesAvailable && !!userId && plus.data?.active === false,
    queryFn: async () => ((await ensurePurchases(userId!)) ? getPlusPackages() : []),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMsg(null);
    try {
      if (await fn()) {
        setMsg({ tone: 'info', text: done });
        // The store confirms through our server; check again shortly.
        setTimeout(() => qc.invalidateQueries({ queryKey: ['plus'] }), 3000);
      }
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  if (plus.isLoading) return <Screen><ScreenSkeleton /></Screen>;

  return (
    <Screen>
      <Text variant="display">Opinion+</Text>
      {plus.data?.active ? (
        <Banner
          message={`You’re a member${plus.data.expires_at ? ` until ${new Date(plus.data.expires_at).toLocaleDateString()}` : ''}. ${plus.data.boosts_left} free ${plus.data.boosts_left === 1 ? 'boost' : 'boosts'} left this month. Thank you!`}
        />
      ) : null}
      {PERKS.map(([title, body]) => (
        <View key={title} style={{ gap: space[1] }}>
          <Text variant="bodyStrong">{title}</Text>
          <Text tone="muted">{body}</Text>
        </View>
      ))}
      <Text variant="caption" tone="faint">
        Voting, asking with credits, results and the AI summary stay free for everyone.
      </Text>

      {!plus.data?.active ? (
        !purchasesAvailable ? (
          <Banner message="Opinion+ isn’t available on this build yet." />
        ) : packages.isLoading ? (
          <ScreenSkeleton lines={1} />
        ) : (
          [...(packages.data ?? [])]
            .sort((a, b) => Number(b.packageType === 'ANNUAL') - Number(a.packageType === 'ANNUAL'))
            .map((p: PurchasesPackage) => (
            <Button
              key={p.identifier}
              variant={p.packageType === 'ANNUAL' ? 'primary' : 'secondary'}
              label={`${p.packageType === 'ANNUAL' ? 'Yearly (best value)' : p.packageType === 'MONTHLY' ? 'Monthly' : p.product.title || 'Opinion+'} · ${p.product.priceString}${
                p.product.introPrice?.price === 0 ? ` · ${p.product.introPrice.periodNumberOfUnits} ${p.product.introPrice.periodUnit.toLowerCase()}s free` : ''
              }`}
              loading={busy}
              onPress={() => {
                track('plus_purchase_started', { package: p.identifier });
                run(() => buy(p), 'Thanks for joining! Your perks unlock in a moment.');
              }}
            />
          ))
        )
      ) : null}

      {purchasesAvailable ? (
        <Button
          label="Restore purchases"
          variant="ghost"
          disabled={busy}
          onPress={() => userId && run(async () => (await ensurePurchases(userId)) && restore(), 'Purchases restored.')}
        />
      ) : null}
      {msg ? <Banner tone={msg.tone} message={msg.text} /> : null}
      <Text variant="caption" tone="faint">
        Renews automatically until you cancel in your App Store or Google Play settings.
      </Text>
      <View style={{ flexDirection: 'row', gap: space[4] }}>
        <Button label="Terms" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)} />
        <Button label="Privacy" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)} />
      </View>
    </Screen>
  );
}
