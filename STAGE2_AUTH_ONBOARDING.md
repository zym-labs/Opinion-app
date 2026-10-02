# Opinion — Stage 2: Authentication, Onboarding & Legal

Builds on [SPEC.md](SPEC.md) and [STAGE1_APP_FLOW.md](STAGE1_APP_FLOW.md) (screens A-01…A-11, S-07). The backend is assumed to be Supabase (Auth + Postgres); final confirmation comes in Stage 5.

## 1. Sign-in methods

| Method | Platform | Notes |
|---|---|---|
| Sign in with Apple | iOS (required by 4.8), Android/web optional | Handle "Hide My Email" relay addresses; Apple sends name only on first sign-in; we don't need it, so discard |
| Google | iOS + Android | Native SDK → ID token → Supabase `signInWithIdToken` |
| Email magic link | All | 6-digit code as well as the link (links break across devices/in-app browsers); code valid 10 min; resend after 60s; max 5 per hour per email |

No passwords, no phone/SMS.
**Account linking:** if the same verified email is used across methods, link to one account. Apple relay emails can't be matched, so they remain separate accounts (accepted).

## 2. Sessions

- Access token (JWT) 1h, refresh token rotated on use, stored in Keychain / Android Keystore (encrypted storage), never AsyncStorage.
- Stay signed in until sign out, deletion, suspension or 90 days of inactivity.
- Sign out revokes the refresh token on the server.
- One account can be signed in on multiple devices; each device has its own push token.
- Suspension check: every API call is checked against `account.status`, enforced in database security rules, so suspension takes effect at the next request, not just the next launch.

## 3. Onboarding state machine

```
signed_in → age_verified → terms_accepted → categories_chosen → communities_step_done → complete
```
- Stored server-side as `profile.onboarding_step`; the app resumes at the first unfinished step on any device.
- The API rejects voting and posting until `complete`.
- Under 18 at A-05: the account is not created (the auth user is deleted immediately). The device is flagged locally, the decision is stored as a hash so retrying with a different year is soft-blocked for 24h, and the store's age signal is used where available.

## 4. Age assurance

- Collect **birth year only** (A-05). 18+ = current year − birth year ≥ 19, or = 18 with a confirmation "I am 18 or older". Simple and conservative.
- **App store age signals:**
  - iOS: Declared Age Range API — request the range `18+`; if the store says under 18, block.
  - Android: Play Age Signals API — same check.
  - Required in Utah/Texas; use everywhere it's available.
- Store: `birth_year`, `age_source` (self / store_signal), `age_checked_at`.
- App Store age rating: **18+** (user-generated content, anonymous). Google Play: Mature 17+ (closest), and declare that the target audience is 18+.
- Birth year can't be edited by the user; corrections go through support.

## 5. Categories & communities at onboarding

- Categories: 1–5 picks from an admin list (launch list ~20, e.g. Tech, Health & Fitness, Fashion, Money, Career, Relationships, Food, Travel, Gaming, Education, Parenting, Cars, Home, Beauty, Pets, Sports, Music, Film & TV, Law (self-selected), Medicine (self-selected)). Changes limited to one every 7 days.
- Communities: optional at onboarding. Campus communities need an email on an allowlisted domain:
  1. enter the .edu address → 6-digit code → verified;
  2. store a hash of the email plus the domain only (raw address not kept);
  3. re-verify every 12 months;
  4. one .edu address can verify only one account.

## 6. Handles & identity

- An internal handle like `u_8f3k2q` is generated automatically and never shown to other users (it appears only in the admin tool and support).
- No display name, no avatar, no bio.
- The account email is used only for login and legal notices.

## 7. Account deletion (S-07, Apple 5.1.1(v), GDPR Art. 17)

On confirm, in one server transaction:
1. Active polls → Removed (voters aren't charged credits; no results).
2. Votes: `user_id` cleared (set to null) — counts and stats stay in aggregates; reasons kept only as anonymous text inside completed summaries and featured insights.
3. Delete: profile, birth year, categories, communities, push tokens, campus email hash, credits, notifications, the auth user.
4. Sign out on all devices.
5. Backups expire on a 30-day rolling basis; the privacy policy states this.

Sign in with Apple: also revoke the Apple token via Apple's REST API (Apple requirement).

## 8. Permissions

| Permission | When asked | If denied |
|---|---|---|
| Notifications | A-11, after explaining the 4 types | App works; a banner in N-01 lets them turn it on later |
| Photos | Only when adding an option image in C-02 (use the system photo picker, which needs no permission on iOS 14+/Android 13+) | — |
| Tracking (ATT) | Never; we don't track across apps | — |

## 9. Legal & compliance deliverables

| Document / task | Contents | Owner |
|---|---|---|
| Privacy policy | Data collected (email, birth year, categories, communities, votes, reasons, device/push tokens, analytics), purposes, legal basis (contract; legitimate interest for safety/analytics), processors (Supabase, OpenAI, push, analytics, crash reporting), retention, deletion, rights, international transfers (EU–US DPF/SCCs), contact | Founder + template; lawyer review recommended |
| Terms of service | 18+, acceptable content, no harassment/personal info about others, poll/reason licence to us (incl. anonymous featuring), moderation and suspension, AI-summary disclaimer (not professional advice — esp. Medicine/Law/Money), termination | Same |
| Community guidelines | Plain-language rules shown in onboarding and reports | Founder |
| AI disclosure | In terms + on every summary: "AI-generated from voters' reasons. May be inaccurate." (EU AI Act Art. 50) | Built into UI |
| Apple privacy labels / Play Data safety | Mirror the privacy policy; "data not linked to you" isn't true for votes, so declare honestly | Founder |
| App age rating questionnaires | Apple new questionnaire (18+), Play IARC | Founder |
| Records of processing + DPIA (GDPR) | Required because we target by age and run large-scale moderation | Founder, template |
| DSA (EU) | Notice-and-action (reporting), reasons sent to removed users (statement of reasons), point of contact; small-company exemptions apply for the rest | Covered by Stage 1 safety flows |
| Data processing agreements | Supabase, OpenAI (enable zero data retention if available), analytics vendor | Founder |

Legal docs are hosted on the web (`opinion.app/privacy`, `/terms`, `/guidelines`) and linked from A-06 and S-01. A-06 records `terms_version` and `accepted_at`; a new version → re-accept on next launch.

## 10. Data collected at onboarding (minimum)

| Field | Why | Retention |
|---|---|---|
| auth id, email (or Apple relay) | Login | Until deletion |
| birth_year, age_source | 18+ gate, age-range targeting | Until deletion |
| terms_version, accepted_at | Legal record | Until deletion + 1 year as a legal record (anonymised) |
| categories[], communities[] | Targeting | Until deletion |
| campus email hash + domain | Verified campus membership | Until deletion or 12 months |
| push tokens | Notifications | Until sign out / token invalid |

No name, phone, location, contacts or device advertising ID.

## 11. Abuse prevention at sign-up

- Rate limit sign-ups per IP and device (e.g. 3 per device per day).
- Device integrity checks: Apple App Attest / Play Integrity on sign-up and vote endpoints, so scripted accounts can't farm credits.
- Block disposable email domains for magic link.
- New accounts: first 3 polls go through stricter moderation; credits from votes count only after the account is 24h old.

## 12. Analytics events (onboarding funnel)

`app_open_first`, `signin_started{method}`, `signin_completed{method}`, `age_blocked`, `terms_accepted`, `categories_saved{count}`, `community_joined{type}`, `campus_verified`, `notif_permission{granted}`, `onboarding_complete{duration_s}`. No email or birth year sent to analytics.

## 13. Open for later stages

- Stage 3: tables `profiles`, `user_categories`, `user_communities`, `campus_verifications`, `consents`, `devices`.
- Stage 5: confirm Supabase, choose the analytics and crash-reporting tools, and check the React Native / Expo libraries for Declared Age Range and Play Age Signals.
- Legal: budget a one-off lawyer review of the privacy policy and terms (~$500–1,500) before launch.
