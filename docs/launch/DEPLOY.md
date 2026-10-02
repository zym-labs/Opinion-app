# Deploy, evaluate and load-test

## 1. Deploy (staging first, then production)
Prerequisites: Phase 0 accounts (`docs/phase0/ACCOUNTS_SETUP.md`), a Supabase access token and the database password.

```bash
cp scripts/secrets.example.env scripts/secrets.staging.env   # fill it in
SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... SEED=1 ./scripts/deploy.sh <staging-ref> scripts/secrets.staging.env
```
Then, once per project, run `scripts/vault-setup.sql` in the SQL editor (turns on the AI and push workers) and make yourself an admin.

Apps: set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in EAS env and `NEXT_PUBLIC_SUPABASE_*` in Vercel.

## 2. AI summary evals (before every prompt or model change)
```bash
cd supabase/functions
ANTHROPIC_API_KEY=... deno run --allow-env --allow-net --allow-write ai-summary/evals/run.ts
```
30 fixtures: 12 normal, 6 tiny minority, 5 prompt injection, 4 personal details, 3 ties. Fails below 90% of fixtures fully passing. Results are written to `ai-summary/evals/last-run.json`. Cost: roughly $1–2 per full run (estimate).

Also read 5 outputs by hand: is the minority fairly represented?

## 3. Load test (staging only)
```bash
# SQL editor: run loadtest/seed.sql (1,000 active polls)
k6 run -e SUPABASE_URL=https://<ref>.supabase.co -e ANON_KEY=... -e SERVICE_KEY=... loadtest/votes.js
# SQL editor: run loadtest/cleanup.sql
```
Targets: 2,000 votes/minute for 5 minutes, <1% failed requests, p95 vote < 800 ms, p95 feed < 400 ms. To test the closer, set the seed polls' `closes_at` to now() + 10 minutes and watch Admin → Metrics and `cron.job_run_details`.
