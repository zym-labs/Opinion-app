# End-to-end flows (Maestro)

Run against a development build connected to the **staging** Supabase project with seed data.

```bash
maestro test .maestro/
```

Accounts (create them in staging, Phase 0):
- `TEST_EMAIL` — an onboarded user in the Tech category with at least 1 poll credit.
- Email codes: staging uses Supabase's test OTP setting (`auth.email.test_otp` in config) so `TEST_CODE` always works for these addresses.

Flows:
| File | Covers |
|---|---|
| `01-sign-in-email.yaml` | A-03/A-04 email code sign-in |
| `02-vote.yaml` | F-01 → F-02 vote with reason, consent, final confirmation → F-03 |
| `03-create-poll.yaml` | C-01…C-05 expert poll with category and duration |
| `04-report-and-hide.yaml` | Report a poll, hide its creator |
| `05-settings.yaml` | Categories cooldown banner, notification prefs, sign out |
