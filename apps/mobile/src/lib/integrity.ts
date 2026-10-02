// Device integrity (STAGE2 §11): App Attest on iOS, Play Integrity on Android.
// Sensitive requests (votes, publishing) carry headers that prove they come from the real app.
// Any failure here just sends no proof; the server decides (report or enforce mode).
import * as AppIntegrity from '@expo/app-integrity';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { env } from './env';
import { supabase } from './supabase';

const keyName = (userId: string) => `app-attest-key-${userId}`;
let androidReady: Promise<void> | null = null;

function prepareAndroid() {
  androidReady ??= env.googleCloudProjectNumber
    ? AppIntegrity.prepareIntegrityTokenProviderAsync(env.googleCloudProjectNumber)
    : Promise.reject(new Error('EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER not set'));
  return androidReady;
}

/** iOS: registers one App Attest key per user per install. Android: warms up the token provider. */
export async function ensureAttested(userId: string) {
  try {
    if (Platform.OS === 'android') return await prepareAndroid();
    if (Platform.OS !== 'ios' || !AppIntegrity.isSupported) return;
    if (await SecureStore.getItemAsync(keyName(userId))) return;
    const { data: challenge, error } = await supabase.rpc('issue_integrity_challenge');
    if (error || !challenge) return;
    const keyId = await AppIntegrity.generateKeyAsync();
    const attestation = await AppIntegrity.attestKeyAsync(keyId, challenge);
    const { error: fnError } = await supabase.functions.invoke('integrity', { body: { keyId, attestation, challenge } });
    if (!fnError) await SecureStore.setItemAsync(keyName(userId), keyId);
  } catch (e) {
    console.warn('integrity attestation skipped', e);
  }
}

/** Headers proving the exact request body comes from this app on this device. */
export async function integrityHeaders(userId: string, body: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'X-Integrity-Platform': Platform.OS };
  try {
    if (Platform.OS === 'ios' && AppIntegrity.isSupported) {
      const keyId = await SecureStore.getItemAsync(keyName(userId));
      if (!keyId) return headers;
      headers['X-Integrity-Key'] = keyId;
      headers['X-Integrity-Token'] = await AppIntegrity.generateAssertionAsync(keyId, body);
    } else if (Platform.OS === 'android') {
      await prepareAndroid();
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, body);
      try {
        headers['X-Integrity-Token'] = await AppIntegrity.requestIntegrityCheckAsync(hash);
      } catch (e) {
        // Providers expire; prepare a fresh one and retry once.
        if (String(e).includes('PROVIDER_INVALID')) {
          androidReady = null;
          await prepareAndroid();
          headers['X-Integrity-Token'] = await AppIntegrity.requestIntegrityCheckAsync(hash);
        } else throw e;
      }
    }
  } catch (e) {
    console.warn('integrity token unavailable', e);
  }
  return headers;
}
