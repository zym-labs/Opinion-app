# Opinion

AI-powered decision app: post a 2-option poll to self-selected experts or a community, get written reasons, and an AI summary of majority and minority views. Private by default, no followers or likes.

## Planning docs
- [SPEC.md](SPEC.md) — signed-off product rules (Stage 0)
- [Market research](reports/Opinion%20app%20market%20research.md)
- [Stage 1 — App flow](STAGE1_APP_FLOW.md)
- [Stage 2 — Auth, onboarding & legal](STAGE2_AUTH_ONBOARDING.md)
- [Stage 3 — Database](STAGE3_DATABASE.md)
- [Stage 4 — API](STAGE4_API.md)
- [Stage 5 — Tech stack](STAGE5_TECH_STACK.md)
- [Stage 6 — Design system](STAGE6_DESIGN_SYSTEM.md)
- [Stage 7 — Roadmap](STAGE7_ROADMAP.md)
- [Stage 8 — MVP checklist](STAGE8_MVP_CHECKLIST.md)

## Development

Monorepo (npm workspaces):

| Path | What |
|---|---|
| `apps/mobile` | Expo (SDK 57) app — Expo Router, Supabase auth |
| `packages/shared` | Design tokens, product limits, Zod schemas (+ contrast tests) |
| `supabase/` | Migrations, pgTAP tests, local config |
| `docs/phase0` | Account setup checklist, seed polls |
| `docs/legal` | Privacy policy, terms, guidelines (drafts) |

```bash
npm install
cp apps/mobile/.env.example apps/mobile/.env.local   # fill in values
npm run mobile                                       # Expo dev server
npm test                                             # shared tests
npx supabase start && npx supabase test db           # needs Docker
```

Sign in with Apple and Google need a development build (`npx eas-cli build --profile development`), not Expo Go.
