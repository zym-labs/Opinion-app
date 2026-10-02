import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

import { env } from './env';
import { supabase } from './supabase';

let googleConfigured = false;

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  if (!credential.identityToken) throw new Error('Apple did not return an identity token');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

/** Returns false when the user cancels. */
export async function signInWithGoogle() {
  if (!googleConfigured) {
    GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      iosClientId: env.googleIosClientId || undefined,
    });
    googleConfigured = true;
  }
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return false;
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an ID token');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
  return true;
}

export async function sendEmailCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut() {
  // Revokes this device's refresh token on the server (STAGE2 §2).
  await supabase.auth.signOut({ scope: 'local' });
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google.
  }
}
