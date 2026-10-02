# Opinion — Stage 8: MVP Checklist

Launch-readiness tracker. Every item has a **bucket** and a **status**. Phase = build phase from [Stage 7](STAGE7_ROADMAP.md). As of 2026-10-02 all planning stages (0–7) are complete; nothing is built yet.

**Buckets:** 🟥 Required for launch · 🟧 Important, soon after launch · 🟦 Post-MVP · ⬛ Intentionally excluded
**Statuses:** Not started · Planned · In design · In development · Testing · Completed · Deferred

## 1. Planning

| Item | Bucket | Status |
|---|---|---|
| Product rules signed off (SPEC.md) | 🟥 | Completed |
| Market research | 🟥 | Completed (check items marked unverified) |
| App flow (Stage 1) | 🟥 | Completed |
| Auth, onboarding & legal plan (Stage 2) | 🟥 | Completed |
| Database design (Stage 3) | 🟥 | Completed |
| API design (Stage 4) | 🟥 | Completed |
| Tech stack (Stage 5) | 🟥 | Completed |
| Design system (Stage 6) | 🟥 | Completed |
| Roadmap (Stage 7) | 🟥 | Completed |
| App Store / Product Hunt competitor sweep | 🟧 | Not started |

## 2. Accounts & onboarding

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Sign in with Apple | 1 | 🟥 | Planned |
| Google sign-in | 1 | 🟥 | Planned |
| Email code / magic link | 1 | 🟥 | Planned |
| Secure session storage, sign out | 1 | 🟥 | Planned |
| Age gate (birth year, 18+) | 2 | 🟥 | Planned |
| App store age signals (iOS / Play) | 2 | 🟥 | Planned |
| Terms acceptance + versioning | 2 | 🟥 | Planned |
| Category selection (max 5, cooldown) | 2 | 🟥 | Planned |
| Community join/leave | 2 | 🟥 | Planned |
| Campus email verification | 2 | 🟥 | Planned |
| Onboarding resume across devices | 2 | 🟥 | Planned |
| Account deletion (in-app, full) | 2 | 🟥 | Planned |
| Notification permission screen | 6 | 🟥 | Planned |
| GDPR data export | — | 🟧 | Planned (manual at launch) |
| Phone/SMS sign-in | — | ⬛ | Excluded |
| Passwords | — | ⬛ | Excluded |
| Public profiles, usernames, avatars | — | ⬛ | Excluded |

## 3. Polls

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Expert polls (1–5 categories, age range ≥5 yrs) | 3 | 🟥 | Planned |
| Community polls (members only) | 3 | 🟥 | Planned |
| Taste mode (optional reasons) | 3 | 🟥 | Planned |
| 2 options, text + optional image | 3 | 🟥 | Planned |
| Image upload, convert, strip EXIF, moderate | 3 | 🟥 | Planned |
| Duration 3–24h, server-enforced | 3 | 🟥 | Planned |
| Audience estimate + block under 20 | 3 | 🟥 | Planned |
| Vote-to-ask credits | 3 | 🟥 | Planned |
| Delete before first vote (refund) | 3 | 🟥 | Planned |
| Local draft saving | 3 | 🟧 | Planned |
| Creator live vote count | 3 | 🟥 | Planned |
| Multi-option polls | — | 🟦 | Roadmap |
| Video polls | — | 🟦 | Roadmap |
| Editing after publish, early end | — | ⬛ | Excluded |
| Live percentages | — | ⬛ | Excluded |
| Search | — | ⬛ | Excluded |

## 4. Voting & feed

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Targeted feed (categories, age, community, hidden creators) | 4 | 🟥 | Planned |
| Results-ready section | 5 | 🟥 | Planned |
| One final vote, creator can't vote | 4 | 🟥 | Planned |
| Reasons: required 20–200 / optional | 4 | 🟥 | Planned |
| "What will most people pick?" | 4 | 🟧 | Planned |
| Featuring consent | 4 | 🟥 | Planned |
| Synchronous reason moderation | 4 | 🟥 | Planned |
| PII + injection screen | 4 | 🟥 | Planned |
| Idempotent vote endpoint | 4 | 🟥 | Planned |
| Offline read-only feed | 4 | 🟧 | Planned |

## 5. Closing, AI & results

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Poll closer job (every minute) | 5 | 🟥 | Planned |
| Thresholds (<10 votes, minority <5) | 5 | 🟥 | Planned |
| AI summary pipeline (majority/minority, citations, exact quotes) | 5 | 🟥 | Planned |
| Fairness check pass | 5 | 🟧 | Planned |
| Retries + Failed-AI state + admin retry | 5 | 🟥 | Planned |
| AI eval set (30 fixtures) passing | 5 | 🟥 | Planned |
| AI labels + sensitive-category disclaimers | 5 | 🟥 | Planned |
| View-once results (close / 10s / server backup) | 5 | 🟥 | Planned |
| Already-viewed & unavailable states | 5 | 🟥 | Planned |
| Creator permanent history | 5 | 🟥 | Planned |
| Result reveal animation | 5 | 🟧 | Planned |

## 6. Retention

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Push: poll ended, summary ready, featured | 6 | 🟥 | Planned |
| New-polls daily digest | 6 | 🟥 | Planned |
| Notification center + preferences | 6 | 🟥 | Planned |
| Profile stats | 6 | 🟧 | Planned |
| Featured insights list | 6 | 🟧 | Planned |
| Share card (creator only) | 6 | 🟥 | Planned |
| Web voting link from share card | — | 🟦 | Roadmap (privacy review first) |
| Followers, likes, comments, DMs | — | ⬛ | Excluded |

## 7. Safety & moderation

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Text moderation (questions, options, reasons) | 3–4 | 🟥 | Planned |
| Image moderation | 3 | 🟥 | Planned |
| Report polls, reasons, featured insights | 3–4 | 🟥 | Planned |
| Self-harm support resources | 3 | 🟥 | Planned |
| Hide creator + manage hidden | 4 | 🟥 | Planned |
| Admin dashboard (queue, review, suspend, 2FA) | 7 | 🟥 | Planned |
| Moderation outcome messages (DSA) | 7 | 🟥 | Planned |
| Suspended-account screen | 2 | 🟥 | Planned |
| Rate limits | 7 | 🟥 | Planned |
| App Attest / Play Integrity | 7 | 🟥 | Planned |
| Disposable-email blocking, sign-up limits | 2 | 🟥 | Planned |
| Stricter moderation for new accounts | 7 | 🟧 | Planned |
| Moderator response within 24h (process + rota) | 8 | 🟥 | Not started |

## 8. Legal & store

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Privacy policy | 0 / 7 | 🟥 | Not started |
| Terms of service | 0 / 7 | 🟥 | Not started |
| Community guidelines | 0 / 7 | 🟥 | Not started |
| Lawyer review | 7 | 🟥 | Not started |
| GDPR records of processing + DPIA | 7 | 🟥 | Not started |
| Vendor data agreements (Supabase, Anthropic, OpenAI, PostHog) | 7 | 🟥 | Not started |
| Apple privacy labels, Play Data safety | 7 | 🟥 | Not started |
| Age rating questionnaires (Apple 18+, Play) | 7 | 🟥 | Not started |
| App Review notes + demo account | 8 | 🟥 | Not started |
| Store listing (screenshots, description) | 8 | 🟥 | Not started |
| Support contact published | 7 | 🟥 | Not started |

## 9. Quality, security, operations

| Item | Phase | Bucket | Status |
|---|---|---|---|
| RLS on every table + CI check | 1 | 🟥 | Planned |
| pgTAP privacy tests | 4 | 🟥 | Planned |
| End-to-end tests (Maestro) for core loop | 7 | 🟥 | Planned |
| Security review (Stage 4 §9) | 7 | 🟥 | Planned |
| Load test (2k votes/min, 1k polls closing) | 7 | 🟧 | Planned |
| Accessibility pass + contrast test | 7 | 🟥 | Planned |
| Sentry + alerts | 1 / 7 | 🟥 | Planned |
| PostHog funnels + north-star dashboard | 1 / 6 | 🟥 | Planned |
| Backups / point-in-time recovery | 1 | 🟥 | Planned |
| Data retention jobs | 6 | 🟧 | Planned |
| Staging environment | 1 | 🟥 | Planned |

## 10. Launch readiness

| Item | Bucket | Status |
|---|---|---|
| Pilot campus + 2–3 ambassadors | 🟥 | Not started |
| 40 seed polls ready | 🟥 | Not started |
| Closed beta (~50 users) run | 🟥 | Not started |
| Go/no-go metrics met (Stage 7 Phase 8) | 🟥 | Not started |
| Landing page live | 🟥 | Not started |

## 11. Post-MVP roadmap (🟦)

Verified experts · reputation · multi-option polls · video polls · creator analytics · freemium (boosts, deeper summaries) · B2B pulse polls · more campuses and segments · web voting links.

## 12. Intentionally excluded (⬛)

Followers · likes · comments/replies · DMs · public profiles · avatars · live percentages · search · ads · cross-app tracking · under-18 users · phone sign-in · passwords · editing published polls.

## Summary

| Bucket | Items |
|---|---|
| 🟥 Required for launch | 90 |
| 🟧 Important soon after | 12 |
| 🟦 Post-MVP | 3 (+ roadmap list) |
| ⬛ Excluded | 7 (+ list) |

Update statuses in this file as work progresses (or move them into an issue tracker in Phase 1).
