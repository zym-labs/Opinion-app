# Launch checklist (single source of truth)

Every setup task needed to take Opinion from code to the stores, in order. Details live in the linked docs. Tick items off here.

Legend: 🔑 secret (never commit) · 👤 needs your accounts or decisions · 🧪 needs a real device.

---

## 0. Decisions only you can make 👤
- [ ] **Legal entity and address**: fill in `docs/legal/PRIVACY_POLICY.md` and `TERMS.md` (`[legal entity name]`, `[privacy@domain]`, `[support@domain]`, EU representative if needed).
- [ ] **Domain**, e.g. `opinion.app`.
- [ ] **Launch campus(es)** and their launch targets (members needed before polls open).
- [ ] **Opinion+ prices**: yearly and monthly, and the trial length (research suggests 14–30 days).
- [ ] **Launch countries.** This decides the store age ratings, which helpline numbers to verify, and which translations ship.

## 1. Accounts 👤 ([phase0/ACCOUNTS_SETUP.md](../phase0/ACCOUNTS_SETUP.md))
- [ ] Apple Developer Program, Google Play Console.
- [ ] Supabase (two projects: **staging** and **production**).
- [ ] Expo / EAS (`eas init` writes the projectId used for push).
- [ ] Anthropic (AI summaries, second opinion, named-person check), OpenAI (moderation).
- [ ] Resend (campus and expert verification emails), PostHog (EU), Sentry.
- [ ] RevenueCat (Opinion+).
- [ ] Web hosting for `apps/web` (e.g. Vercel).
- [ ] Google Cloud project (Sign in with Google and Play Integrity).

## 2. Replace placeholders in code
- [ ] `apps/mobile/src/lib/legal.ts`: `SITE` and `SUPPORT_EMAIL` (currently `opinion.example`).
- [ ] `apps/mobile/app.json`:
  - [ ] `applinks:opinion.example`, and every Android intent filter `host` (`/p/ /i/ /f/ /room/`);
  - [ ] `iosUrlScheme: com.googleusercontent.apps.REPLACE_IN_PHASE_0`;
  - [ ] the `expo-widgets` `groupIdentifier` if the bundle id changes.
- [ ] Create the App Group `group.app.opinion.mobile` in the Apple Developer portal (widgets).
- [ ] Turn on the capabilities: Sign in with Apple, App Attest, Push, Live Activities, Associated Domains, App Groups.

## 3. Secrets and settings 🔑
**Supabase Edge Functions** (`supabase secrets set …`, for staging and production):
| Secret | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | AI summaries, second opinion, named-person check |
| `OPENAI_API_KEY` | moderation (fails open without it: set it!) |
| `RESEND_API_KEY`, `EMAIL_FROM` | verification emails |
| `EMAIL_HASH_PEPPER` | hashing campus and expert emails (random 32+ bytes; never change after launch) |
| `APPLE_TEAM_ID`, `APPLE_BUNDLE_ID` | App Attest, Sign in with Apple token revoke |
| `APP_ATTEST_ALLOW_DEV` | staging only (`true`); **unset in production** |
| `REVENUECAT_WEBHOOK_SECRET` | Opinion+ webhook |
| `PUBLIC_SITE_URL` | links in assistant replies |

**Mobile app (EAS env, `EXPO_PUBLIC_*`):**
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`;
- `GOOGLE_WEB_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID`;
- `GOOGLE_CLOUD_PROJECT_NUMBER`;
- `SENTRY_DSN`;
- `POSTHOG_KEY` and `POSTHOG_HOST`;
- `REVENUECAT_IOS_KEY` and `REVENUECAT_ANDROID_KEY`.

Never set `EXPO_PUBLIC_DEMO` in store builds.

**Website (hosting env):**
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `NEXT_PUBLIC_SUPPORT_EMAIL`;
- `NEXT_PUBLIC_APP_STORE_URL` and `NEXT_PUBLIC_PLAY_STORE_URL`;
- `APPLE_TEAM_ID` and `ANDROID_CERT_SHA256` (for universal and app links).

## 4. Backend deploy (staging first) ([DEPLOY.md](DEPLOY.md))
- [ ] `supabase link`, then `supabase db push` (all migrations).
- [ ] `supabase functions deploy`: all functions, including `mcp`, `rooms`, `second-opinion` and `revenuecat`.
- [ ] Check the cron jobs exist (`select jobname from cron.job`):
  - close polls, AI worker and push worker;
  - digest and last calls;
  - daily question, return path and decision check-ins;
  - vote bursts, reputation and impact recaps;
  - pruning notifications and rooms.
- [ ] Auth: providers Apple, Google and email; redirect URLs; **OAuth server** on (assistant app) plus a consent page at `/oauth/consent` (**not built yet**, see [ASSISTANT_APP.md](ASSISTANT_APP.md)).
- [ ] Create the first admin (`update profiles set is_admin = true …`) and turn on admin MFA (aal2).
- [ ] Seed: categories, communities and campus domains, starter polls, expert domains ([SEED_POLLS.md](../phase0/SEED_POLLS.md)).
- [ ] Write the **daily questions** for the first 2–4 weeks (Admin → Daily question).
- [ ] Set the **campus support line** for each launch campus (Admin → Campus partners).
- [ ] Run the AI summary evals and the load test on staging ([DEPLOY.md](DEPLOY.md) §2–3).

## 5. Payments (Opinion+) 👤
- [ ] Create the subscription products in App Store Connect and Play Console (yearly, monthly, introductory free trial).
- [ ] Connect both stores in RevenueCat: entitlement `plus`, a "current" offering with ANNUAL and MONTHLY packages.
- [ ] Point the RevenueCat webhook at `https://<project>.supabase.co/functions/v1/revenuecat` with header `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
- [ ] Sandbox purchase, then check that `my_plus()` shows active. 🧪

## 6. Website
- [ ] Deploy `apps/web` on the domain. Check `/privacy`, `/terms`, `/guidelines`, `/support`, `/transparency` and `/admin`.
- [ ] Check `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return the right team ID and SHA-256.
- [ ] Publish an **accessibility statement** (European Accessibility Act).

## 7. Legal and content updates 👤
- [ ] Privacy policy, processors:
  - add **RevenueCat**, **Apple and Google** (payments) and **Resend**;
  - note that AI is also used for the second opinion and the named-person check;
  - list the new data: decision areas, 10/10/10 notes, reputation (private), rooms (deleted after 1 day), language.
- [ ] Privacy policy, retention: notifications 90 days and 1 year; rooms 1 day. **Decide the moderation-records retention** (the policy says 2 years; add a cleanup job or change the text).
- [ ] Terms: sponsored questions (Campus Pulse) are labelled and opt-in; the Opinion+ auto-renewal terms; the assistant app.
- [ ] Community guidelines: no questions about identifiable private people; Relationships topic rules.
- [ ] Have **native speakers review** `apps/mobile/src/locales/{es,pt,hi,id}.ts`.
- [ ] **Verify the helpline numbers** in `components/crisis-support.tsx` for each launch country.

## 8. Builds and device testing 🧪
- [ ] `eas build --profile development` (iOS and Android): the widget, Live Activity, purchases, rating prompt, QR code and Photos saving all need it.
- [ ] Run through on real phones:
  - [ ] **Core flow:** sign up (Apple, Google, email), the 18+ check, onboarding (topics, decision areas, communities), vote, first-vote push prompt, result story, share card, story slides.
  - [ ] **Asking:** create a poll (templates, 10/10/10, friends-only), boost, Live Activity, close, decision, journal, AI second opinion.
  - [ ] **Links and groups:** friend link and invite link from a fresh install, close friends circle, room mode with 3 phones.
  - [ ] **Safety:** crisis wording, named-person block, report, appeal.
  - [ ] **Accessibility:** VoiceOver and TalkBack through the whole flow, the largest text size, Reduce Motion.
  - [ ] **Performance:** feed under 2 seconds on a mid-range Android (Sentry traces).
- [ ] Beta ([BETA_PLAN.md](BETA_PLAN.md)): TestFlight and Play internal testing with a first campus group.

## 9. Store submission 👤 ([STORE_LISTING.md](STORE_LISTING.md), [STORE_PLAYBOOK.md](STORE_PLAYBOOK.md), [APP_REVIEW_NOTES.md](APP_REVIEW_NOTES.md))
- [ ] Age rating questionnaires (18+ user-generated content, anonymous, AI), privacy nutrition labels, data safety form.
- [ ] Screenshots (demo mode) and an app preview video.
- [ ] Custom product pages (students, career, shopping, friends) and the first In-App Event.
- [ ] Featuring nomination (about 3 months ahead).
- [ ] Review notes: demo account, how moderation and appeals work, that AI is labelled, that sponsored questions are opt-in.

## 10. After launch
- [ ] Assistant app: submit to the ChatGPT App Directory and Claude connectors ([ASSISTANT_APP.md](ASSISTANT_APP.md)).
- [ ] Campus ambassador program; TikTok creator briefs (results as ready-made content).
- [ ] Weekly: moderation queue, appeals, integrity flags, AI-quality flags, and the North-Star metric (share of polls that close with 10+ reasoned votes).
- [ ] Monthly: transparency page check, campus partner reports.
- [ ] Next in code: Expo SDK 58 upgrade, then Siri (App Intents), then App Clip ([NATIVE_FEATURES_PLAN.md](NATIVE_FEATURES_PLAN.md)).
