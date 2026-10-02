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
| Sign in with Apple | 1 | 🟥 | In development |
| Google sign-in | 1 | 🟥 | In development |
| Email code / magic link | 1 | 🟥 | In development |
| Secure session storage, sign out | 1 | 🟥 | In development |
| Age gate (birth year, 18+) | 2 | 🟥 | In development |
| App store age signals (iOS / Play) | 2 | 🟥 | In development (expo-age-range) |
| Terms acceptance + versioning | 2 | 🟥 | In development |
| Category selection (max 5, cooldown) | 2 | 🟥 | In development |
| Community join/leave | 2 | 🟥 | In development |
| Campus email verification | 2 | 🟥 | In development |
| Onboarding resume across devices | 2 | 🟥 | In development |
| Account deletion (in-app, full) | 2 | 🟥 | In development |
| Notification permission screen | 6 | 🟥 | In development |
| GDPR data export | — | 🟧 | In development (in-app download) |
| Phone/SMS sign-in | — | ⬛ | Excluded |
| Passwords | — | ⬛ | Excluded |
| Public profiles, usernames, avatars | — | ⬛ | Excluded |

## 3. Polls

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Expert polls (1–5 categories, age range ≥5 yrs) | 3 | 🟥 | In development |
| Community polls (members only) | 3 | 🟥 | In development |
| Taste mode (optional reasons) | 3 | 🟥 | In development |
| 2 options, text + optional image | 3 | 🟥 | In development |
| Image upload, convert, strip EXIF, moderate | 3 | 🟥 | In development |
| Duration 3–24h, server-enforced | 3 | 🟥 | In development |
| Audience estimate + block under 20 | 3 | 🟥 | In development |
| Vote-to-ask credits | 3 | 🟥 | In development |
| Delete before first vote (refund) | 3 | 🟥 | In development |
| Local draft saving | 3 | 🟧 | In development |
| Creator live vote count | 3 | 🟥 | In development |
| Multi-option polls | — | 🟦 | Roadmap |
| Video polls | — | 🟦 | Roadmap |
| Editing after publish, early end | — | ⬛ | Excluded |
| Live percentages | — | ⬛ | Excluded |
| Search | — | ⬛ | Excluded |

## 4. Voting & feed

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Targeted feed (categories, age, community, hidden creators) | 4 | 🟥 | In development |
| Results-ready section | 5 | 🟥 | In development |
| One final vote, creator can't vote | 4 | 🟥 | In development |
| Reasons: required 20–200 / optional | 4 | 🟥 | In development |
| "What will most people pick?" | 4 | 🟧 | In development |
| Featuring consent | 4 | 🟥 | In development |
| Synchronous reason moderation | 4 | 🟥 | In development |
| PII + injection screen | 4 | 🟥 | In development |
| Idempotent vote endpoint | 4 | 🟥 | In development |
| Offline read-only feed | 4 | 🟧 | In development |

## 5. Closing, AI & results

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Poll closer job (every minute) | 5 | 🟥 | In development |
| Thresholds (<10 votes, minority <5) | 5 | 🟥 | In development |
| AI summary pipeline (majority/minority, citations, exact quotes) | 5 | 🟥 | In development |
| Fairness check pass | 5 | 🟧 | In development |
| Retries + Failed-AI state + admin retry | 5 | 🟥 | In development |
| AI eval set (30 fixtures) passing | 5 | 🟥 | In development (30 fixtures + runner; needs API key to run) |
| AI labels + sensitive-category disclaimers | 5 | 🟥 | In development |
| View-once results (close / 10s / server backup) | 5 | 🟥 | In development |
| Already-viewed & unavailable states | 5 | 🟥 | In development |
| Creator permanent history | 5 | 🟥 | In development |
| Result reveal animation | 5 | 🟧 | In development |

## 6. Retention

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Push: poll ended, summary ready, featured | 6 | 🟥 | In development |
| New-polls daily digest | 6 | 🟥 | In development |
| Notification center + preferences | 6 | 🟥 | In development |
| Profile stats | 6 | 🟧 | In development |
| Featured insights list | 6 | 🟧 | In development |
| Share card (creator only) | 6 | 🟥 | In development |
| Web voting link from share card | — | 🟦 | Roadmap (privacy review first) |
| Followers, likes, comments, DMs | — | ⬛ | Excluded |

## 7. Safety & moderation

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Text moderation (questions, options, reasons) | 3–4 | 🟥 | In development |
| Image moderation | 3 | 🟥 | In development |
| Report polls, reasons, featured insights | 3–4 | 🟥 | In development |
| Self-harm support resources | 3 | 🟥 | In development |
| Hide creator + manage hidden | 4 | 🟥 | In development |
| Admin dashboard (queue, review, suspend, 2FA) | 7 | 🟥 | In development |
| Moderation outcome messages (DSA) | 7 | 🟥 | In development |
| Suspended-account screen | 2 | 🟥 | In development |
| Rate limits | 7 | 🟥 | In development |
| App Attest / Play Integrity | 7 | 🟥 | In development (report mode; enforce after beta) |
| Disposable-email blocking, sign-up limits | 2 | 🟥 | In development (email blocklist; per-device limits need App Attest) |
| Stricter moderation for new accounts | 7 | 🟧 | In development |
| Moderator response within 24h (process + rota) | 8 | 🟥 | Not started |

## 8. Legal & store

| Item | Phase | Bucket | Status |
|---|---|---|---|
| Privacy policy | 0 / 7 | 🟥 | In design (draft) |
| Terms of service | 0 / 7 | 🟥 | In design (draft) |
| Community guidelines | 0 / 7 | 🟥 | In design (draft) |
| Lawyer review | 7 | 🟥 | Not started |
| GDPR records of processing + DPIA | 7 | 🟥 | Not started |
| Vendor data agreements (Supabase, Anthropic, OpenAI, PostHog) | 7 | 🟥 | Not started |
| Apple privacy labels, Play Data safety | 7 | 🟥 | Not started |
| Age rating questionnaires (Apple 18+, Play) | 7 | 🟥 | Not started |
| App Review notes + demo account | 8 | 🟥 | In design (draft) |
| Store listing (screenshots, description) | 8 | 🟥 | In design (draft text) |
| Support contact published | 7 | 🟥 | In development (page built) |

## 9. Quality, security, operations

| Item | Phase | Bucket | Status |
|---|---|---|---|
| RLS on every table + CI check | 1 | 🟥 | In development |
| pgTAP privacy tests | 4 | 🟥 | In development |
| End-to-end tests (Maestro) for core loop | 7 | 🟥 | In development (flows written; need staging) |
| Security review (Stage 4 §9) | 7 | 🟥 | In development (first pass done) |
| Load test (2k votes/min, 1k polls closing) | 7 | 🟧 | In development (k6 script; needs staging) |
| Accessibility pass + contrast test | 7 | 🟥 | In development (contrast CI test + local a11y lint rules; manual VoiceOver/TalkBack pass pending) |
| Sentry + alerts | 1 / 7 | 🟥 | Planned |
| PostHog funnels + north-star dashboard | 1 / 6 | 🟥 | In development (events instrumented; dashboards need PostHog account) |
| Backups / point-in-time recovery | 1 | 🟥 | Planned |
| Data retention jobs | 6 | 🟧 | In development |
| Staging environment | 1 | 🟥 | In development (deploy script ready; needs accounts) |

## 10. Launch readiness

| Item | Bucket | Status |
|---|---|---|
| Pilot campus + 2–3 ambassadors | 🟥 | Not started |
| 40 seed polls ready | 🟥 | In design (draft) |
| Closed beta (~50 users) run | 🟥 | Not started |
| Go/no-go metrics met (Stage 7 Phase 8) | 🟥 | Not started |
| Landing page live | 🟥 | In development (built; not deployed) |

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
