# Opinion Privacy Policy — DRAFT

> **Draft for lawyer review (Phase 7). Not legal advice.** Fill every `[bracket]` before publishing.

_Last updated: [date] · Version [1.0]_

## Who we are
Opinion is operated by [legal entity name], [address] ("we"). Contact: [privacy@domain]. [EU representative, if required.]

## What Opinion does
Opinion lets adults post two-option polls to people with matching interests or communities. Voters choose an option and may give a short reason. When a poll closes, an AI system summarises the reasons. Your votes, reasons and identity are never shown to other users.

## Data we collect
| Data | Why | Legal basis (GDPR) |
|---|---|---|
| Email address (or Apple private relay address) | Sign-in, account and legal notices | Contract |
| Birth year | Confirm you're 18+, age-range targeting of polls | Contract; legal obligation (age assurance) |
| Age range signal from Apple/Google | Confirm you're 18+ | Legal obligation |
| Chosen categories and communities | Show you relevant polls | Contract |
| Campus email (stored only as a one-way hash) and its domain | Verify campus community membership | Contract |
| Polls you create (text, images) | Run the service; your poll history | Contract |
| Votes, reasons, predictions | Calculate results, AI summaries, your profile stats | Contract |
| Reports you submit, moderation records | Safety and legal compliance | Legitimate interest; legal obligation |
| Device push tokens | Notifications you allow | Consent (OS permission) |
| App usage events, crash reports | Improve reliability and features | Legitimate interest |

We do **not** collect your name, phone number, contacts, precise location or advertising ID, and we don't track you across other apps or sell your data.

## How AI is used
Reasons from voters are processed by [Anthropic] to create summaries and select up to 3 anonymous featured quotes (only from voters who agreed). Text and images are checked by [OpenAI]'s moderation service. We send reason text only, never your identity. AI summaries are labelled and may be inaccurate.

## Who can see what
- Other users never see who you are, how you voted or what you wrote — except that, if you agree when voting, your reason may appear as an anonymous quote in a poll's results.
- Poll creators see results, the AI summary and featured quotes — never individual votes or reasons.
- Our moderators can see content and the internal account ID linked to it when handling reports.

## Processors
[Supabase] (hosting, database), [Anthropic] (AI summaries), [OpenAI] (moderation), [Expo] (push notifications), [Resend] (email), [PostHog] (analytics, EU), [Sentry] (crash reports). International transfers rely on [EU–US Data Privacy Framework / Standard Contractual Clauses].

## Retention
| Data | Kept |
|---|---|
| Account data | Until you delete your account |
| Raw reason text | 90 days after the poll closes (featured quotes kept, anonymised) |
| Poll results | For the creator's history; unlinked from deleted accounts |
| Reports and moderation records | 2 years |
| Backups | Up to 30 days |

## Your rights
Access, correction, deletion, portability, objection and complaint to your data protection authority. Delete your account any time in **Settings → Delete account**; request a copy of your data at [privacy@domain].

## Age
Opinion is only for people aged 18 and over. We delete accounts we learn belong to someone younger.

## Changes
We'll notify you in the app before material changes take effect.
