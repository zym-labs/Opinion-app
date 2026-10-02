# Opinion — Stage 7: Development Roadmap

Phased build plan based on Stages 1–6. Assumes **one full-time developer** (with AI coding help); with two developers, phases 2–5 shrink by ~40%. Durations are estimates, not commitments.

Changes from the PDF's 8 phases: safety moves into the poll and voting phases (not Phase 7), analytics and crash reporting into Phase 1, and live percentages are dropped (creator vote count only).

## Overview

| Phase | Name | Weeks | Ends with |
|---|---|---|---|
| 0 | Prep | 1 | Accounts, legal drafts, pilot campus chosen |
| 1 | Foundation | 2 | App runs on both platforms with sign-in, CI, Sentry, PostHog |
| 2 | User system | 2 | Full onboarding incl. age gate and campus verification |
| 3 | Poll creation + safety core | 3 | Moderated poll creation, credits, audience estimate, reporting |
| 4 | Voting + feed | 2 | Targeted feed, moderated voting, hide creator |
| 5 | Closing, AI & results | 3 | Polls close, AI summaries, view-once results |
| 6 | Retention | 2 | Notifications, profile stats, history, share cards |
| 7 | Admin & hardening | 2 | Admin dashboard, rate limits, integrity checks, load test |
| 8 | Beta & launch | 4 | Closed beta at pilot campus → store release |
| | **Total** | **~21 weeks (~5 months)** | |

```
Wk  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21
P0 ██
P1    █████
P2          █████
P3                ████████
P4                         █████
P5                               ████████
P6                                        █████
P7                                              █████
P8                                                    ███████████
```

## Phase 0 — Prep (week 1)

- Register Apple Developer + Google Play accounts, domain, company/legal entity if needed.
- Create Supabase (staging + prod), Vercel, Expo, PostHog, Sentry, Anthropic, OpenAI, Resend accounts.
- Draft privacy policy, terms, community guidelines from templates; book lawyer review for Phase 7.
- Choose the **pilot campus**; contact 2–3 student ambassadors; list ~40 seed poll ideas.
- Decide launch region (EU or US) → Supabase region.

**Exit:** all accounts live, pilot campus named, legal drafts exist.

## Phase 1 — Foundation (weeks 2–3)

- Monorepo (pnpm, Turborepo), `apps/mobile`, `apps/web`, `packages/shared`, `supabase/`.
- Expo app with Expo Router, tabs skeleton, NativeWind with Stage 6 tokens, light/dark.
- Supabase migrations: `profiles`, enums, RLS default deny, CI test "every table has RLS".
- Sign in with Apple, Google, email code; secure token storage; sign out.
- Sentry + PostHog wired (EU); first events.
- GitHub Actions: lint, typecheck, tests, migrations check; EAS builds to TestFlight / Play internal.
- Core UI components: Button, Chip, Banner, Toast, Skeleton, BottomSheet.

**Exit:** a signed-in user sees empty tabs on a real iPhone and Android device from CI builds.

## Phase 2 — User system (weeks 4–5)

- Onboarding screens A-01…A-11 with server-side `onboarding_step`.
- Age gate + store age signals (custom Expo module if needed — budget 3 days).
- Terms acceptance + `consents`.
- Categories (max 5, 7-day cooldown) and communities (join/leave).
- Campus verification: send code, verify, hash storage, domain allowlist.
- Settings S-01…S-04, account deletion (S-07) end to end, incl. Apple token revoke.
- Seed: categories, launch communities, pilot campus domain.

**Exit:** a new user completes onboarding on both platforms; under-18 blocked; deletion verified to remove all personal data.

## Phase 3 — Poll creation + safety core (weeks 6–8)

- Tables: polls, options, targeting, credit ledger; RPCs: `estimate_audience`, `delete_poll`.
- Create flow C-00…C-06, draft saving, image upload (convert, strip EXIF, moderate).
- Text moderation on question/options (OpenAI); `CONTENT_REJECTED` handling.
- Credits: signup bonus, publish cost, refund; CreditPill.
- `publish_poll` with audience ≥ 20 rule and AudienceMeter.
- **Safety core:** `submit_report` + report sheet on polls; self-harm resources; reports table.
- My Polls M-01/M-02 with live vote count (Realtime).

**Exit:** a user can publish a moderated, targeted poll and report one; credits balance correctly in tests.

## Phase 4 — Voting + feed (weeks 9–10)

- `feed_polls` view with targeting rules, sorting, pagination; F-01 + empty state.
- Vote screen F-02 with OptionTile, ReasonField, PredictionPicker, ConsentRow.
- `v1/votes`: integrity check placeholder, `cast_vote` transaction, synchronous moderation, idempotency.
- Async reason screen: PII redaction + injection flag.
- Waiting list (F-04), vote credits with 24h delay.
- Hide creator + Hidden creators settings (S-05); report on reasons.
- pgTAP tests: one vote per user, creator can't vote, voters never see other votes.

**Exit:** 10 test users vote on each other's polls on staging; privacy tests pass.

## Phase 5 — Closing, AI & results (weeks 11–13)

- `close_due_polls` cron, aggregates, `result_views`, threshold logic (<10 votes, minority <5).
- AI pipeline: pgmq worker, prompts v1, structured output, citation and exact-quote validation, fairness check, retries, `failed_ai`.
- **Eval set** of 30 fixtures (injection, tiny minority, PII, ties); pass rate target before shipping.
- Result screens F-05/F-05a/F-05b/F-06/F-07 with reveal animation; view-once logic (close or 10s, server backup).
- Creator result M-03; sensitive-category disclaimers; AI labels.

**Exit:** a staging poll closes on time and shows a validated summary; evals pass; view-once works after app kill.

## Phase 6 — Retention (weeks 14–15)

- Push: device registration, Expo Push worker, the 4 notification types + daily digest, preferences (S-04), deep links.
- Notification center N-01.
- Profile P-01/P-02 with `my_stats()`.
- Share card generation M-04 + OS share sheet; PostHog share event.
- Answerer feedback: "your reason was featured", "you matched the majority".

**Exit:** a full loop works: create → notify → vote → close → notify → result → share.

## Phase 7 — Admin & hardening (weeks 16–17)

- Next.js admin: login with 2FA, moderation queue, item review, user lookup, suspend, communities/categories, seed polls, AI retry, metrics (AD-01…AD-07).
- Moderation outcome notifications; DSA statement-of-reasons messages.
- Rate limits table; App Attest / Play Integrity verification live.
- Security review: RLS audit, logs free of personal data, secrets check.
- Load test: 2k votes/minute on staging, closer job with 1k polls closing at once.
- Website: landing, privacy, terms, guidelines; lawyer review done; store privacy labels and age rating questionnaires.
- Accessibility pass (screen reader, Dynamic Type, contrast test green).

**Exit:** a moderator can handle a report within the app's flow; security checklist (Stage 4 §9) all ticked.

## Phase 8 — Beta & launch (weeks 18–21)

- **Week 18:** closed beta via TestFlight / Play closed testing with ~50 pilot-campus students; seed 40 polls; ambassador onboarding.
- **Weeks 19–20:** fix, tune thresholds and credit cost, review AI summaries by hand, watch the north-star metric (share of polls with ≥ 10 reasoned votes).
- **Week 21:** App Store + Play submission (allow 1–2 weeks for review, incl. possible 1.2 questions — prepare reviewer notes and a demo account), public launch at the pilot campus.

**Go / no-go for launch:**
- ≥ 60% of beta polls reach 10 reasoned votes
- Median time to first vote < 30 min
- D7 retention ≥ 30% in beta
- Zero open high-severity reports older than 24h
- Crash-free sessions ≥ 99.5%

## After launch (months 6–9)

| Priority | Item |
|---|---|
| 1 | Second and third campuses (repeat the playbook) |
| 2 | Tune vote-to-ask ratio and audience thresholds from data |
| 3 | Web voting link for creators' shared cards (growth loop) — check privacy first |
| 4 | Verified experts (Blind-style work-email or credential check) |
| 5 | Freemium tests (boosted reach, deeper summaries) |
| 6 | Multi-option polls, then B2B pulse polls |

## Risks to the schedule

| Risk | Impact | Mitigation |
|---|---|---|
| Age-signal library missing | +3–5 days | Build custom module early in Phase 2 |
| App Store rejection under 1.2 | +1–3 weeks | Reviewer notes stressing polling not chat; report/block visible in demo |
| AI summaries fail evals | +1–2 weeks | Start prompts and evals in Phase 3 in parallel |
| Not enough beta voters | Launch delay | Ambassadors, seed polls, lower threshold for beta only |
| Single developer illness/overload | Slip | Keep Phase 6 items cuttable (share card, profile stats) |

## Team & budget (5 months)

| Item | Cost |
|---|---|
| Infrastructure (Stage 5 estimate) | ~$300–500 total |
| Apple + Google accounts | $124 |
| Lawyer review (privacy + terms) | $500–1,500 |
| Beta incentives (food, merch for ambassadors) | $200–500 |
| Optional: designer for icon/brand polish | $300–1,500 |
| **Total cash** | **~$1,500–4,000** |
