# Opinion — Consolidated Spec (Stage 0: signed off 2026-10-02)

Source: Opinion_App_System_Planning_v1.pdf + [market research](reports/Opinion%20app%20market%20research.md). All rules below are accepted as final for MVP.

## Principles (fixed)
Private by default · Creator-controlled sharing · Temporary polls · Human opinions first · No followers/likes/popularity.
Positioning: anonymous *polling* with aggregate results — never anonymous chat (no DMs, no replies, no visible authorship) (Apple 1.2).

## Launch strategy
- First segment: college students, launched one verified campus community at a time (Fizz model); then pre-purchase shoppers and early-career professionals.
- Seed each community with polls before opening it.
- No paid acquisition early (installs cost about $3–4 each, with nothing to recoup it).

## Onboarding
0. Optional: try 3 starter polls before signing up (practice votes, not saved; birth year asked first)
1. Sign in — Apple + Google + email magic link (Apple 4.8 requires Apple if Google is offered)
2. Age gate, 18+ only; store birth year; honour the age signals the app stores now provide (Texas/Utah laws)
3. Choose up to 5 Expert Categories (labelled "self-selected"); editable in Settings, rate-limited
4. Join unlimited Communities (admin-curated list; campus communities need a verified .edu email)
5. Notification permission
- Internal handle only, never shown publicly
- Account deletion in-app (Apple 5.1.1(v))

## Polls
- **Expert:** up to 5 categories, optional age range (minimum width 5 years), reason required (20–200 chars)
- **Community:** one community (creator must be a member), reason optional (≤200)
- **Taste mode:** the creator can mark a poll as "taste" (e.g. which outfit), which makes reasons optional, since forcing a reason can worsen taste choices
- 2 options, each with optional text + image
- Duration 3–24h, whole hours, enforced server-side
- No edits after publish; creator may delete only before first vote; no early end; creator cannot vote
- **Vote-to-ask credits:** voting earns credits and posting a poll spends one (e.g. 3 votes = 1 poll; new users start with 1 free)
- Before publishing, creator sees an estimated audience size; publishing is blocked if fewer than ~20 people match, with a prompt to widen the targeting
- Lifecycle: Draft → Active → Closing → Summarizing → Completed | Failed-AI (results without summary, retry). Side states: Removed, Deleted.

## Voting
- One final vote per user per poll
- Optional second question: "What will most people pick?" (used to surface a minority answer that may be right)
- Consent at vote time that the reason may be featured anonymously
- Reasons pass a moderation filter (OpenAI moderation; not Perspective API, which shuts down end of 2026) plus a personal-details and prompt-injection screen before AI/featuring
- No live percentages or reasons visible to anyone before close; creator sees vote count only
- Vote timestamps never exposed

## Privacy thresholds
- Fewer than 10 votes: no percentages and no AI summary, just "not enough responses" (raised from 5)
- Minority summary shown only when the minority has at least 5 reasons; otherwise just "a minority disagreed"
- Featured quotes are stripped of names, places and identifying details

## AI pipeline
1. Count votes in code; never ask the model.
2. Wrap each reason in a tagged block with an ID, as untrusted input. The summary call has no tools.
3. Cluster reasons by side; summarize majority and minority separately, each with its own fixed length.
4. Structured output: every claim cites reason IDs, and an automatic check drops any claim without them.
5. Pick 3 featured insights from real quotes, chosen for variety, including at least 1 minority quote when that side meets the threshold. Each must exactly match the stored text.
6. A second pass checks for omitted views and fairness, then everything is labelled "AI-generated" (EU AI Act Art. 50).
References: Habermas Machine (DeepMind 2024), Jigsaw Sensemaker, Pol.is.

## Results
- Voters see results once, as a short story sequence ("viewed" = leaving the result, or 5 minutes after opening as a crash backup), then the poll leaves their feed.
- Creators keep permanent history; vote outcomes stored for profile stats.
- Creator never sees raw reasons, only the AI summary and 3 anonymous featured insights
- Opening a "poll ended" notification after viewing shows an "already viewed" state
- Result states: voter `Waiting → Available → Viewed (hidden)`; creator `Available → History (permanent)`
- Answerer feedback (stands in for likes): "your reason was featured", "you matched the majority"

## Navigation
Bottom tabs: Feed · Create · My Polls · Profile. Bell icon in header opens Notifications. No Search in MVP.

## Sharing
Creator only: result card with poll preview, winner, %, AI summary, branding. This is the main growth loop outside the app.

## Notifications
New polls (batched digest), poll ended, AI summary ready, featured insight.

## Profile
Owner-only: Polls Voted, Majority Picks, Featured Insights, Top Categories, vote credits.

## Safety (MVP-required)
Report poll/reason, block creator (hides their polls), pre-AI moderation filter, admin moderation queue with fast response times, published contact info (Apple 1.2). Never make misleading claims about AI moderation (FTC v. NGL, 2024).

## Compliance & metrics
- Stages 2–3: privacy policy, terms, data retention, AI disclosure, age rating (Apple's new questionnaire)
- Analytics + crash reporting in build Phase 1
- North-star metric: share of polls that close with at least 10 reasoned votes
- Also: time until a poll's first vote, vote-to-ask ratio, D1/D7/D30 retention (target 60/40/25)

## Monetization (post-MVP)
MVP free. Later: consumer freemium (boosted reach, deeper AI summaries), then opt-in B2B "pulse polls" priced against Pollfish (about $1–3 per response). Ads ruled out.

## Account deletion
Active polls → Removed; past votes kept in anonymous totals but unlinked from the account; featured insights stay (they were never attributed).

## Open
tech stack (Supabase proposed) · App Store/Product Hunt competitor sweep · check the citations marked unverified in the research report.

## Stages
0 Sign-off → 1 App Flow → 2 Auth & Onboarding (+legal) → 3 Database → 4 API (after BaaS decision) → 5 Tech Stack → 6 Design System → 7 Roadmap → 8 MVP Checklist

## Post-MVP features built (2026-10-02)
- **2–4 options per poll.** Majority = top option; the minority summary covers every other option. Ties at the top have no winner.
- **Verified experts.** Users verify a work/university email on an admin-approved domain for one of their categories (hash only, 12 months). Results show "Verified experts (N): …" only when ≥ 5 verified experts voted.
- **Creator insights.** Private to the asker: verified vs self-selected split, prediction accuracy, share explaining or agreeing to be quoted. Groups under 10 votes hidden; no timings.
- **Follow-up polls.** From a completed poll; same audience by default; "Follow-up to …" in feed and vote screen; the original poll's voters are notified.
- **Decision outcomes.** After close, the asker shares what they chose (or "none") and whether it helped; voters are told anonymously ("Your vote matched their decision"). A reminder goes out 2 days after close if they haven't. Profile shows "Askers went with your pick".
- **Last-call nudges.** Polls under 10 votes closing within 2 hours notify up to 30 eligible voters, at most one nudge per person per day, one round per poll.
- **Weekly streak.** 3+ votes a week; one missed week is forgiven; private, never loss-framed.
- **Phase 1 retention and safety (2026-10-03).**
  - **Crisis safety net:** self-harm wording in a question or reason shows local helplines instead of posting.
  - **Notification limit:** nudges are capped at 4 a week; results are never capped. Push permission is asked after the first vote, not during onboarding.
  - **Rating prompt:** shown only at happy moments, 7+ days and 5+ sessions in, at most every 120 days.
  - **Return path:** messages on day 3, 7 and 14 away, then stop; a "While you were away" card on return.
  - **Daily question:** one shared poll a day for everyone, written ahead by admins.
  - **Decision journal:** past decisions with a 30-day "glad you did?" check-in and personal patterns.
  - **"Need more info":** doesn't count as a vote; the asker is told at 3 requests.
  - **Verdict labels** on results (clear call, leaning, split, dead heat).
  - **"Summary seems off" flag** and an "AI can miss nuance" note.
  - **Voting-burst detection:** flagged for admin review, never removed automatically.
  - **Translation file:** errors and tabs moved in so far.
  - **Performance tracing:** feed load and vote submit.
