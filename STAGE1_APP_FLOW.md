# Opinion — Stage 1: Complete App Flow

Built on [SPEC.md](SPEC.md) (signed off 2026-10-02). Screen IDs (e.g. `F-01`) are referenced by later stages.

## 1. Navigation structure

```
Launch
 ├─ Not signed in ──► Auth & Onboarding (A-*)
 ├─ Suspended ──────► A-09 Account suspended
 └─ Signed in ──────► Main tabs
                       ├─ Feed (F-*)        [default]
                       ├─ Create (C-*)      [modal flow]
                       ├─ My Polls (M-*)
                       └─ Profile (P-*) ──► Settings (S-*)
                      Header: Credits badge · Bell ► Notifications (N-01)
Deep links: notification → poll vote / result / history item
```

## 2. Auth & Onboarding

| ID | Screen | Contents | Exits |
|---|---|---|---|
| A-01 | Splash | Logo, session check | A-02 / Feed / A-09 |
| A-02 | Welcome | 3-card intro: ask · get reasons · AI summary. "Polling, not chat" | A-03 |
| A-03 | Sign in | Apple · Google · Email | A-04 (email) / A-05 |
| A-04 | Email magic link | Enter email → "check inbox" state, resend after 60s | A-05 |
| A-05 | Age gate | Birth year picker; under 18 → A-10 | A-06 |
| A-06 | Terms & privacy | Summary + links, AI-disclosure note, accept | A-07 |
| A-07 | Choose categories | Grid, max 5, "self-selected" label, min 1 | A-08 |
| A-08 | Join communities | Curated list; campus communities → A-08a; skip allowed | A-11 |
| A-08a | Verify campus email | .edu email → 6-digit code | A-08 |
| A-09 | Account suspended | Reason, appeal contact, sign out | — |
| A-10 | Not eligible | "Opinion is 18+", no account created | — |
| A-11 | Notification prompt | Explain the 4 notification types → OS prompt | Feed (first-run tour) |

Returning user: A-01 → Feed. Signed out with an existing account: A-03 → Feed (onboarding skipped if complete; resume at the first unfinished step).

## 3. Feed (tab 1)

| ID | Screen | Contents |
|---|---|---|
| F-01 | Feed | Sections: **Results ready** (your voted polls, closed, not viewed) on top · **Open polls** matching your categories/communities, sorted by closing soonest. Card: question, 2 options, type badge (Expert/Community/Taste), target, time left. Overflow ⋯ → Report / Hide creator |
| F-01e | Feed empty | "No open polls for your interests" → join more communities / edit categories / create a poll |
| F-02 | Vote | Question, options (images zoomable), select one → reason field (counter 20–200 or optional) → optional "What will most people pick?" → featured-consent checkbox (required) → Submit. Confirm sheet: "Votes are final" |
| F-02r | Reason rejected | Inline error from moderation: "Please rephrase — this reason can't be accepted" (no category detail) |
| F-03 | Vote submitted | "+1 credit (2/3 to your next poll)", "Results in 5h 12m", back to feed. Poll moves to the waiting list |
| F-04 | Waiting | Voted, still open: your pick, time left; no counts |
| F-05 | Result | Winner, percentages, vote count, your pick vs majority; AI summary (Majority / Minority sections, "AI-generated" label); up to 3 featured insights; "you predicted correctly". Banner: "You can view this once". Viewed = screen closed or 10s |
| F-05a | Result, too few votes | Under 10 votes: "Not enough responses for results" (no %) |
| F-05b | Result, summary pending | Percentages + "AI summary is on its way" (Summarizing / Failed-AI retry) |
| F-06 | Already viewed | From a stale notification: "You've already viewed this result" + your stored outcome (majority/minority) |
| F-07 | Poll unavailable | Removed or deleted poll |

## 4. Create (tab 2, modal)

| ID | Screen | Contents |
|---|---|---|
| C-00 | No credits | "Vote on 3 polls to post one" → Feed |
| C-01 | Poll type | Expert · Community; toggle "Taste question (reasons optional)" |
| C-02 | Question & options | Question (≤120 chars), Option A/B text (≤60) + optional image each; moderation runs on Next |
| C-03a | Expert targeting | Pick 1–5 categories; optional age range (min 5-year span) |
| C-03b | Community targeting | Pick one of your joined communities |
| C-04 | Duration | Whole hours, 3–24 |
| C-05 | Review | Preview card, live estimated audience. Under 20 → Publish disabled + "Widen your audience" suggestions. Costs 1 credit |
| C-06 | Published | "Live until 21:00", vote count updates, shortcut to M-02 |
| C-err | Content rejected | Moderation failure on the question, options or images |

Drafts: leaving mid-flow → "Save draft?"; one draft kept locally.

## 5. My Polls (tab 3)

| ID | Screen | Contents |
|---|---|---|
| M-01 | My polls list | Segments: Active · Completed. Empty state → Create |
| M-02 | Active poll | Question, time left, **vote count only**; Delete (only while 0 votes); Removed banner if moderated |
| M-03 | Completed poll | Permanent result: %, summary, featured insights (never raw reasons); Share button |
| M-04 | Share card preview | Generated image: question, winner, %, summary excerpt, branding → OS share sheet |

## 6. Profile (tab 4) & Settings

| ID | Screen | Contents |
|---|---|---|
| P-01 | Profile (owner only) | Polls voted · Majority picks % · Featured insights count · Top categories · Credits |
| P-02 | Featured insights | Your quotes that were featured (and the poll question) |
| S-01 | Settings | Categories, Communities, Notifications, Hidden creators, Privacy & data, Help, Legal, Sign out, Delete account |
| S-02 | Edit categories | Same as A-07; "next change available in N days" when rate-limited |
| S-03 | Manage communities | Join/leave; campus verification |
| S-04 | Notification prefs | Toggle each type; digest time for new polls |
| S-05 | Hidden creators | "Hidden creator · from poll 'Which laptop…'" → Unhide |
| S-06 | Help & contact | FAQ, contact email (Apple 1.2), report a problem |
| S-07 | Delete account | Consequences listed (active polls removed, votes anonymised) → confirm by typing DELETE → signed out |

## 7. Notifications

| ID | Screen | Contents |
|---|---|---|
| N-01 | Notification center | List: new-poll digest → F-01 · poll ended (voter) → F-05/F-06 · your poll's summary ready → M-03 · your reason featured → P-02 |

## 8. Safety flows

- **Report** (from any poll card, vote screen, result, featured insight): reason picker (spam, hate, harassment, personal info, sexual, self-harm, other) → "Thanks, we'll review within 24h". Self-harm report → shows support resources immediately.
- **Hide creator** (from a poll card): confirm → their polls disappear from your feed, can be undone in S-05.
- **Moderation outcome notifications**: "A poll you reported was removed" (no details); creator: "Your poll was removed for <rule>".

## 9. Admin (web dashboard, not in the mobile app)

| ID | Screen | Contents |
|---|---|---|
| AD-01 | Login | Staff only, 2FA |
| AD-02 | Moderation queue | Reports + auto-flags, sorted by severity/age; SLA timer |
| AD-03 | Item review | Content, report reasons, creator's handle and history; actions: dismiss · remove · warn · suspend |
| AD-04 | User lookup | By handle/email; strikes, suspension, unsuspend |
| AD-05 | Communities & categories | Create/edit/archive, seed polls, campus domain list |
| AD-06 | AI failures | Polls in Failed-AI; retry |
| AD-07 | Metrics | Share of polls reaching 10 reasoned votes, time until first vote, retention, report volume |

## 10. Lifecycles

**Poll** (server-driven)
```
Draft ─publish(credit-1)─► Active ─timer─► Closing ─► Summarizing ─► Completed
                             │                          └─ AI error ─► Failed-AI ─retry─► Summarizing
                             ├─ creator delete (0 votes) ─► Deleted (credit refunded)
                             └─ moderator ─► Removed   (any state)
Closing with <10 votes ─► Completed (no summary, "not enough responses")
```

**Result, per voter**: `Waiting (F-04) → Available (F-05, Results ready) → Viewed (F-06, removed from feed)`

**Result, creator**: `Active (M-02) → Completed (M-03, permanent)`

**Account**: `Onboarding → Active ⇄ Suspended → Deleted`

**Reason**: `Submitted → Moderation pass/fail → Eligible for AI → Featured?`

## 11. Edge cases covered

- App killed on the result screen → the 10s rule marks it viewed; otherwise it stays Available.
- Poll closes while the user is on the vote screen → submit fails: "This poll just closed".
- Poll removed after a vote → voter sees F-07; it doesn't count toward stats.
- Creator's account deleted mid-poll → poll Removed; voters' credits kept.
- Featured quote reported after closing → removed from the result and from future views.
- Offline → cached feed shown read-only; voting disabled with a banner.
- Category removed by admin → users keep their other categories; prompted to pick a replacement.
