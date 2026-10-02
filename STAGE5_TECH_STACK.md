# Opinion — Stage 5: Tech Stack

Chosen for a solo/small team, one codebase for iOS + Android, low cost at MVP scale, and the requirements in Stages 2–4. Prices are approximate as of 2026-10 and should be checked on each vendor's pricing page before committing.

## 1. Summary

| Layer | Choice | Why |
|---|---|---|
| Mobile app | **React Native + Expo (SDK latest), TypeScript** | One codebase for iOS/Android, over-the-air updates, EAS builds without a Mac for most work |
| Navigation | Expo Router | File-based routes map 1:1 to Stage 1 screen IDs; deep links built in |
| UI | NativeWind (Tailwind for RN) + custom components; Reanimated for motion | Fast to build; tokens come from Stage 6 |
| Server state | TanStack Query | Caching, retries, offline read-only feed |
| Local state | Zustand (small) | Draft poll, UI state |
| Forms/validation | React Hook Form + Zod (schemas shared with Edge Functions) | One source of truth for limits (20–200 chars etc.) |
| Secure storage | expo-secure-store | Tokens in Keychain/Keystore (Stage 2) |
| Backend | **Supabase** (Postgres 16, Auth, RLS, Storage, Realtime, Edge Functions, pg_cron, pgmq) | Matches Stages 3–4; one vendor; local dev with CLI |
| AI summaries | **Claude Sonnet 5.5** via Anthropic API, fallback **Claude Haiku 4.5** | Strong at structured output and faithful summarization |
| Moderation | OpenAI `omni-moderation-latest` (text + images, free) + Claude Haiku 4.5 PII/injection check | Perspective API ends 2026-12-31 |
| Push | Expo Push Service (APNs + FCM underneath) | Free, one API for both platforms |
| Email (codes, legal) | Resend (or Postmark) via Supabase Auth SMTP | Reliable delivery for magic codes |
| Share cards | Satori + resvg in an Edge Function | Server-rendered PNG, no headless browser |
| Image processing | `imagescript` / Supabase image transforms in Edge Function | WebP, resize, strip EXIF |
| Analytics | PostHog (cloud EU) | Funnels, retention, feature flags in one; EU hosting for GDPR |
| Crashes/errors | Sentry (app + Edge Functions) | Source maps for Expo |
| Device integrity | `@expo/app-integrity` or `react-native-app-attest` + Play Integrity, verified in Edge | Stops scripted credit farming |
| Age signals | Native module for iOS Declared Age Range + Play Age Signals (Expo config plugin; build ourselves if no maintained library) | Stage 2 §4 |
| Admin dashboard | Next.js (App Router) + shadcn/ui on Vercel, Supabase auth + TOTP 2FA | Fast CRUD UI; separate domain |
| Legal/marketing site | Same Next.js project (`opinion.app`) — landing, privacy, terms, guidelines | One deploy |
| CI/CD | GitHub Actions + EAS Build/Submit + EAS Update; Supabase migrations via CLI | Automated tests, builds and store submissions |
| Testing | Jest + React Native Testing Library; Maestro for end-to-end flows; pgTAP for DB; Deno test for Edge | Stage 4 §11 |
| Repo | Monorepo (pnpm + Turborepo): `apps/mobile`, `apps/web`, `packages/shared` (Zod schemas, types, constants), `supabase/` | Shared validation and types |

## 2. Why not the alternatives

| Alternative | Reason not chosen |
|---|---|
| Flutter | Good, but TypeScript lets the app, admin, Edge Functions and validation share code and types |
| Native Swift + Kotlin | Two codebases; too slow for a small team |
| Firebase | NoSQL makes the aggregate queries, RLS-style privacy and SQL constraints in Stage 3 harder; Supabase keeps the data model relational |
| Custom Node/Go server | More to build and run (auth, queues, cron, storage); revisit only if Supabase limits are hit |
| GPT-only stack | OpenAI moderation is used because it's free; for summaries Claude is preferred for faithfulness — keep the provider behind one `summarize()` interface so it can be swapped |

## 3. Environments

| Env | Supabase | App | Notes |
|---|---|---|---|
| Local | `supabase start` (Docker) | Expo dev client | Seed data, mocked AI unless a key is set |
| Staging | Separate project | EAS internal distribution / TestFlight | Real AI with low limits |
| Production | Separate project, EU or US region (pick by first market) | App Store / Play | Point-in-time recovery enabled |

Secrets: Supabase function secrets + EAS secrets; nothing in the repo.

## 4. Estimated monthly cost

| Item | MVP / beta (~1k users) | Early growth (~20k users) |
|---|---|---|
| Supabase | $25 Pro (+ $0–10 compute) | $25–100 + compute add-ons |
| Anthropic API (summaries) | ~$5–20 (≈ $0.04 per poll estimate) | ~$100–300 |
| OpenAI moderation | $0 | $0 |
| Expo EAS | $0 (free tier) or $19 | $99 |
| Vercel | $0–20 | $20 |
| PostHog / Sentry | $0 (free tiers) | $0–50 each |
| Resend | $0 | $20 |
| Apple Developer / Google Play | $99/yr + $25 once | — |
| Domain | ~$15/yr | — |
| **Total** | **~$50–100/month** | **~$300–700/month** |

## 5. Key libraries (mobile)

`expo-router`, `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `nativewind`, `react-native-reanimated`, `expo-secure-store`, `expo-notifications`, `expo-image-picker`, `expo-image`, `expo-apple-authentication`, `@react-native-google-signin/google-signin`, `expo-localization`, `@sentry/react-native`, `posthog-react-native`, `expo-haptics`.

## 6. Repo layout

```
opinion/
  apps/
    mobile/      app/(auth)/…  app/(tabs)/feed|create|my-polls|profile  components/  lib/
    web/         app/(site)/privacy|terms  app/admin/…
  packages/
    shared/      schemas.ts (Zod)  constants.ts (limits)  types/database.ts (generated)
  supabase/
    migrations/  seed.sql  functions/v1-votes|v1-polls-*|ai-summary|moderation|push|…  tests/ (pgTAP)
  prompts/       summary.v1.md  fairness-check.v1.md  pii-screen.v1.md
  evals/         fixtures/*.json  run.ts
```

## 7. Risks & checks before building

- **Age-signal APIs:** confirm the React Native library support; plan for a small custom Expo module (≈ 2–3 days).
- **Supabase Edge limits:** CPU time for share-card rendering; if too slow, move it to a Vercel function.
- **pgmq/pg_cron** availability on the chosen plan (both available on Supabase Pro).
- **Model IDs and prices:** check them against Anthropic's docs at build time.
- **Expo Push** has no delivery guarantee; poll results are always visible in the app regardless of push.
