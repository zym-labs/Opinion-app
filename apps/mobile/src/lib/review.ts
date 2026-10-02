// Asks for an App Store / Play rating only at happy moments, and rarely:
// 7+ days after first open, 5+ sessions, at most every 120 days (Apple also caps it at 3 a year).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const FIRST_OPEN = 'review-first-open';
const SESSIONS = 'review-sessions';
const LAST_ASKED = 'review-last-asked';
const DAY = 24 * 60 * 60_000;

/** Call once per app launch. */
export async function countSession() {
  try {
    if (!(await AsyncStorage.getItem(FIRST_OPEN))) await AsyncStorage.setItem(FIRST_OPEN, String(Date.now()));
    const n = Number((await AsyncStorage.getItem(SESSIONS)) ?? 0) + 1;
    await AsyncStorage.setItem(SESSIONS, String(n));
  } catch {
    // Storage unavailable: no prompt, no harm.
  }
}

/** Call right after something good happened (matched the majority, got quoted, a decision paid off). */
export async function maybeAskForReview() {
  try {
    const first = Number((await AsyncStorage.getItem(FIRST_OPEN)) ?? Date.now());
    const sessions = Number((await AsyncStorage.getItem(SESSIONS)) ?? 0);
    const last = Number((await AsyncStorage.getItem(LAST_ASKED)) ?? 0);
    if (Date.now() - first < 7 * DAY || sessions < 5 || Date.now() - last < 120 * DAY) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(LAST_ASKED, String(Date.now()));
    await StoreReview.requestReview();
  } catch {
    // Never let a rating prompt break the flow.
  }
}
