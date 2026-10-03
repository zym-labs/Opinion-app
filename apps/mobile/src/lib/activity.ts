// Activity signals: tells the server you're active (for the return-path messages) and works out
// whether you've been away long enough to show a "while you were away" summary.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { rpc } from './api';
import { locale } from './i18n';
import { countSession } from './review';

const LAST_OPEN = 'last-open';
const HOUR = 60 * 60_000;
let lastTouch = 0;

function touch() {
  if (Date.now() - lastTouch < HOUR) return;
  lastTouch = Date.now();
  rpc('touch_active').catch(() => {});
}

/** Root layout: records activity on launch and whenever the app returns to the foreground. */
export function useActivity(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    touch();
    countSession();
    rpc('set_locale', { p_locale: locale }).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => s === 'active' && touch());
    return () => sub.remove();
  }, [enabled]);
}

/** True when the previous visit was 3+ days ago. Evaluated once per app launch. */
export function useWasAway() {
  const [away, setAway] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(LAST_OPEN)
      .then((v) => {
        if (v && Date.now() - Number(v) >= 3 * 24 * HOUR) setAway(true);
        return AsyncStorage.setItem(LAST_OPEN, String(Date.now()));
      })
      .catch(() => {});
  }, []);
  return away;
}
