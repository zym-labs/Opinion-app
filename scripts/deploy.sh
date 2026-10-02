#!/usr/bin/env bash
# Deploys database, Edge Functions and secrets to a Supabase project (staging or production).
#
#   SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... ./scripts/deploy.sh <project-ref> <env-file>
#
# env-file: copy scripts/secrets.example.env, fill it in, never commit it.
# After the first deploy, run scripts/vault-setup.sql once in the SQL editor (enables the cron workers).
set -euo pipefail

REF="${1:?usage: deploy.sh <project-ref> <env-file>}"
ENV_FILE="${2:?usage: deploy.sh <project-ref> <env-file>}"
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"
: "${SUPABASE_DB_PASSWORD:?set SUPABASE_DB_PASSWORD}"
cd "$(dirname "$0")/.."

echo "→ Linking $REF"
npx supabase link --project-ref "$REF" --password "$SUPABASE_DB_PASSWORD"

echo "→ Running database tests locally is CI's job; pushing migrations"
npx supabase db push --linked --password "$SUPABASE_DB_PASSWORD"

if [[ "${SEED:-0}" == "1" ]]; then
  echo "→ Seeding categories and communities"
  npx supabase db push --linked --include-seed --password "$SUPABASE_DB_PASSWORD"
fi

echo "→ Setting function secrets from $ENV_FILE"
npx supabase secrets set --project-ref "$REF" --env-file "$ENV_FILE"

echo "→ Deploying Edge Functions"
npx supabase functions deploy --project-ref "$REF" --use-api --prune

echo "✓ Deployed. If this is the first deploy: run scripts/vault-setup.sql in the SQL editor."
