import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

import { env } from './env';

export function initMonitoring() {
  if (env.sentryDsn) Sentry.init({ dsn: env.sentryDsn, sendDefaultPii: false });
}

export const posthog = env.posthogKey ? new PostHog(env.posthogKey, { host: env.posthogHost }) : null;

// Event names from STAGE2 §12. Never send email, birth year or reason text.
type EventName = 'signin_started' | 'signin_completed' | 'signin_failed';

export function track(event: EventName, props?: Record<string, string | number | boolean>) {
  posthog?.capture(event, props);
}
