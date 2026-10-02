// App store age signals (STAGE2 §4): Apple Declared Age Range (iOS 26+) and Google Play Age Signals.
// Required where app-store age laws apply (e.g. Utah, Texas). Self-declared birth year stays the baseline.
import * as AgeRange from 'expo-age-range';
import { Platform } from 'react-native';

/**
 * true  → the store says the user is 18+
 * false → the store says the user is under 18 (block)
 * null  → no signal (not regulated, not supported, declined, or an error): rely on birth year
 */
export async function getStoreSaysAdult(): Promise<boolean | null> {
  if (Platform.OS === 'web') return null;
  try {
    // Skip the prompt where Apple confirms no age-assurance law applies.
    const eligible = await AgeRange.isEligibleForAgeFeaturesAsync().catch(() => null);
    if (eligible === false) return null;

    if (Platform.OS === 'android') {
      const status = await AgeRange.requestAgeSignalsAccessAsync();
      if (status !== null && status !== 'SHARED') return null;
    }

    const range = await AgeRange.requestAgeRangeAsync({ threshold1: 18 });
    if (range.lowerBound != null && range.lowerBound >= 18) return true;
    if (range.upperBound != null && range.upperBound < 18) return false;
    return null;
  } catch {
    return null;
  }
}
