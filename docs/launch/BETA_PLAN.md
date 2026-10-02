# Closed beta plan (STAGE7 Phase 8, weeks 18–21)

## Before week 18
- [ ] Staging and production Supabase projects live; migrations pushed; functions deployed; Vault secrets `project_url` and `service_role_key` set (enables the cron workers).
- [ ] Function secrets: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_HASH_PEPPER` (random, never change it after launch).
- [ ] Pilot campus community + email domains set in the admin dashboard.
- [ ] 2 moderators with admin access and TOTP set up:
  `update public.profiles set is_admin = true where id = (select id from auth.users where email = '...');`
- [ ] Moderator rota covering every day (target: no open high-severity report older than 24h).
- [ ] 40 seed polls posted through Admin → Seed polls, staggered so ~10 are open at any time.
- [ ] TestFlight + Play closed testing tracks; 50 invite slots.
- [ ] Maestro flows passing against staging.

## Week 18 — invite
- 2–3 ambassadors invite ~50 students. Free coffee/merch for the first 30 who complete onboarding.
- In-app: nothing extra — test the real product.

## Weeks 19–20 — watch and tune
Daily in Admin → Metrics and PostHog:

| Metric | Target | If missed |
|---|---|---|
| Polls with ≥10 reasoned votes | ≥ 60% | More seed polls; lower the minimum duration to 6h; nudge digest time |
| Median time to first vote | < 30 min | Send the digest twice a day; ambassadors vote early |
| D7 retention | ≥ 30% | Interview 5 drop-offs |
| Oldest open report | < 24h | Add moderator cover |
| Crash-free sessions | ≥ 99.5% | Fix before submission |
| AI failures | < 5% of closed polls | Check `ai_jobs.error`; adjust prompt; retry |

Read 20 AI summaries by hand each week: is the minority fairly represented? Any made-up claims?

Tunable settings (in `packages/shared/src/constants.ts` and SQL):
- credit cost per poll (3 votes), signup bonus, minimum audience (20), result threshold (10), minority threshold (5).

## Week 21 — go / no-go
Launch if all targets above are met. Then submit to App Store and Play (`docs/launch/APP_REVIEW_NOTES.md`, `docs/launch/STORE_LISTING.md`) and open to the whole pilot campus.
