// Shareable links (universal links on the SITE domain; the web page falls back to the stores).
// A link opened before sign-up is parked here and followed once onboarding completes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { SITE } from './legal';

export const pollLink = (code: string) => `${SITE}/p/${code}`;
export const inviteLink = (code: string) => `${SITE}/i/${code}`;
export const circleLink = (code: string) => `${SITE}/f/${code}`;
export const resultLink = (code: string) => `${SITE}/r/${code}`;
export const roomLink = (code: string) => `${SITE}/room/${code}`;

const PENDING_KEY = 'pending-link';
type Pending = { kind: 'p' | 'i' | 'f' | 'room'; code: string };

export const parkLink = (link: Pending) => AsyncStorage.setItem(PENDING_KEY, JSON.stringify(link)).catch(() => {});

/** Follows a parked link once the user can use it. */
export function usePendingLink(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (!raw) return;
        AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
        const { kind, code } = JSON.parse(raw) as Pending;
        if (kind === 'p') router.push({ pathname: '/p/[code]', params: { code } });
        else if (kind === 'f') router.push({ pathname: '/f/[code]', params: { code } });
        else if (kind === 'room') router.push({ pathname: '/room/[code]', params: { code } });
        else router.push({ pathname: '/i/[code]', params: { code } });
      })
      .catch(() => {});
  }, [enabled]);
}
