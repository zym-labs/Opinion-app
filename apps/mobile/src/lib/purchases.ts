// Opinion+ purchases through RevenueCat. The store is the source of truth; RevenueCat's webhook updates
// our database, and the app only reads its status from there (my_plus). Without a RevenueCat key
// (local dev, Expo Go) the paywall says Opinion+ isn't available yet.
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { env } from './env';

const apiKey = Platform.OS === 'ios' ? env.revenuecatIosKey : Platform.OS === 'android' ? env.revenuecatAndroidKey : '';
let configuredFor: string | null = null;

export const purchasesAvailable = !!apiKey;

/** Ties purchases to the Supabase user id, so the webhook knows whose subscription it is. */
export async function ensurePurchases(userId: string) {
  if (!apiKey) return false;
  if (configuredFor === userId) return true;
  if (configuredFor === null) Purchases.configure({ apiKey, appUserID: userId });
  else await Purchases.logIn(userId);
  configuredFor = userId;
  return true;
}

export async function getPlusPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Returns false when the person cancelled the store sheet. */
export async function buy(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(pkg);
    return true;
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw e;
  }
}

export const restore = () => Purchases.restorePurchases();
