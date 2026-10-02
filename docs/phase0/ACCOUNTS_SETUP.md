# Phase 0 — Accounts & setup checklist

These steps need you (the account owner): they involve creating accounts, accepting terms and entering payment details, which Claude can't do for you. Tick each item and paste the non-secret IDs into `apps/mobile/.env.local` / EAS environment variables. **Never commit secrets.**

## 1. Store & developer accounts

- [ ] **Apple Developer Program** ($99/yr) — enrol as an organisation if you have a legal entity (D-U-N-S number needed), otherwise as an individual.
  - [ ] Create App ID `app.opinion.mobile` with **Sign in with Apple** capability.
  - [ ] Create a Services ID + key for Sign in with Apple → paste into Supabase Auth → Apple.
- [ ] **Google Play Console** ($25 once) — create app `app.opinion.mobile`.
- [ ] **Expo account** → `npx eas-cli@latest login`, then in `apps/mobile`: `npx eas-cli@latest init` (adds `extra.eas.projectId` to app config).
  - [ ] Add an `EXPO_TOKEN` GitHub secret and set repo variable `EAS_BUILD_ENABLED=true` to turn on CI builds.

## 2. Backend & services

- [ ] **Supabase** — create two projects: `opinion-staging`, `opinion-prod` (region: EU if launching in Europe, US otherwise — can't be changed later).
  - [ ] Upgrade prod to Pro ($25/mo) before beta (backups, no pausing).
  - [ ] Auth → Email: enable, OTP length 6, expiry 600s.
  - [ ] Auth → Apple + Google providers enabled with the IDs below.
  - [ ] Link: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
- [ ] **Google Cloud** project → OAuth consent screen (external) → OAuth client IDs: Web (for Supabase), iOS, Android (with SHA-1 from EAS credentials).
  - [ ] Replace `REPLACE_IN_PHASE_0` in `apps/mobile/app.json` with the iOS client's reversed ID.
- [ ] **Anthropic** API key (summaries) — set a monthly spend limit.
- [ ] **OpenAI** API key (moderation only).
- [ ] **Resend** — verify the sending domain; plug SMTP into Supabase Auth.
- [ ] **Sentry** — org + project `opinion-mobile`; set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` as EAS secrets.
- [ ] **PostHog** (EU cloud) — project `opinion`; copy the project key.
- [ ] **Vercel** — for the website/admin (Phase 7).

## 3. Domain & legal

- [ ] Register a domain (e.g. `opinion.app` or an available alternative) and set up `support@` and `privacy@` mailboxes.
- [ ] Decide on a legal entity (affects store listings, liability, the privacy policy "controller").
- [ ] Fill the blanks in `docs/legal/*.md` drafts; book the lawyer review for Phase 7.

## 4. Launch preparation

- [ ] Choose the **pilot campus** and confirm its email domain(s).
- [ ] Recruit 2–3 student ambassadors.
- [ ] Review and extend `docs/phase0/SEED_POLLS.md`.

## Values to collect (non-secret)

| Variable | Where it goes |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, EAS env |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `.env.local`, EAS env |
| `EXPO_PUBLIC_SENTRY_DSN` | `.env.local`, EAS env |
| `EXPO_PUBLIC_POSTHOG_KEY` | `.env.local`, EAS env |
