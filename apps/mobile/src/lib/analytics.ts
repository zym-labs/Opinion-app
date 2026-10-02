import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

import { env } from './env';

export function initMonitoring() {
  if (env.sentryDsn) Sentry.init({ dsn: env.sentryDsn, sendDefaultPii: false });
}

export const posthog = env.posthogKey ? new PostHog(env.posthogKey, { host: env.posthogHost }) : null;

/** Links events to the account's internal id (never email, birth year or reason text). */
export function identify(userId: string | null) {
  if (!posthog) return;
  if (userId) posthog.identify(userId);
  else posthog.reset();
}

// Event names (STAGE2 §12, STAGE4 §10). Properties must never contain email, birth year, poll text or reasons.
type Events = {
  signin_started: { method: string };
  signin_completed: { method: string };
  signin_failed: { method: string };
  try_started: Record<string, never>;
  try_poll_voted: { n: number };
  try_completed: { polls: number };
  age_blocked: { source: 'birth_year' | 'store_signal' };
  terms_accepted: Record<string, never>;
  categories_saved: { count: number };
  community_joined: { kind: 'topic' | 'campus' };
  campus_verified: Record<string, never>;
  notif_permission: { granted: boolean };
  onboarding_complete: Record<string, never>;
  vote_cast: { type: string; is_taste: boolean; with_reason: boolean; predicted: boolean; seconds_left_bucket: string };
  vote_failed: { code: string };
  poll_published: { type: string; hours: number; with_images: boolean; age_range: boolean; friends_only: boolean };
  publish_failed: { code: string };
  friend_link_shared: Record<string, never>;
  invite_shared: Record<string, never>;
  insight_helpful: Record<string, never>;
  poll_boosted: { notified: number };
  template_used: { id: string };
  result_viewed: { state: string; cards_seen: number; finished: boolean };
  summary_quote_opened: Record<string, never>;
  how_ai_works_opened: Record<string, never>;
  report_submitted: { target: string; reason: string };
  creator_hidden: Record<string, never>;
  share_card: Record<string, never>;
  data_exported: Record<string, never>;
};

export function track<E extends keyof Events>(event: E, props?: Events[E]) {
  posthog?.capture(event, props as Record<string, string | number | boolean> | undefined);
}

/** Coarse time-left bucket so events don't carry exact poll timings. */
export function timeBucket(closesAt: string) {
  const h = (new Date(closesAt).getTime() - Date.now()) / 3_600_000;
  return h < 1 ? '<1h' : h < 6 ? '1-6h' : h < 12 ? '6-12h' : '12h+';
}
