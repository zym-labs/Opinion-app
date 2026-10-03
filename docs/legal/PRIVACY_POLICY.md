# Opinion Privacy Policy — DRAFT

> **Draft for lawyer review (Phase 7). Not legal advice.** Fill every `[bracket]` before publishing.

_Last updated: [date] · Version [1.1]_

## Who we are
Opinion is operated by [legal entity name], [address] ("we"). Contact: [privacy@domain]. [EU representative, if required.]

## What Opinion does
Opinion lets adults ask a question with 2–4 options to people with matching interests, communities or their close friends. Voters pick an option and may give a short reason. When a poll closes, an AI system summarises the reasons. Your votes, reasons and identity are never shown to other users.

## Data we collect
| Data | Why | Legal basis (GDPR) |
|---|---|---|
| Email address (or Apple private relay address) | Sign-in, account and legal notices | Contract |
| Birth year | Confirm you're 18+, age-range targeting of polls | Contract; legal obligation (age assurance) |
| Age range signal from Apple/Google | Confirm you're 18+ | Legal obligation |
| Topics, communities and "what you're deciding about" | Show you relevant polls and templates | Contract |
| Device language | Show the app and AI summaries in your language | Contract |
| Campus or work email (stored only as a one-way hash) and its domain | Verify campus membership or expertise | Contract |
| Polls you create (text, images), your decision and 30-day check-in | Run the service; your poll history and decision journal | Contract |
| Private "Think it through" (10/10/10) notes | Your decision journal; only you can see them | Contract |
| Votes, reasons, predictions, "helpful" marks, "need more info" requests | Results, AI summaries, choosing fair featured quotes, your private stats | Contract |
| Close friends circle (who joined your link), referrals, rooms you joined | Friends-only polls, invite rewards, room votes | Contract |
| A private reputation score (quoted reasons, helpful marks, correct predictions, upheld moderation decisions) | Prioritise reliable reports; never shown to others | Legitimate interest |
| Reports you submit, moderation records, appeals | Safety and legal compliance | Legitimate interest; legal obligation |
| Opinion+ subscription status (from Apple/Google via RevenueCat) | Provide paid features | Contract |
| Device push tokens, app integrity keys | Notifications you allow; preventing fake accounts | Consent (OS permission); legitimate interest |
| App usage events, crash and performance reports | Improve reliability and features | Legitimate interest |

We do **not** collect your name, phone number, contacts, precise location or advertising ID. We don't track you across other apps, show ads or sell your data. Payment details are handled by Apple and Google; we never see them.

## How AI is used
- **Summaries:** voters' reasons are processed by [Anthropic] to create a summary of each side and to suggest up to 3 anonymous featured quotes (only from voters who agreed).
- **Second opinion (optional, asker only):** when you ask for it, the poll's question, options, result and summary are sent to [Anthropic] to produce a short, labelled "AI's take".
- **Safety checks:** questions are checked by [Anthropic] for singling out an identifiable private person. Text and images are checked by [OpenAI]'s moderation service, including for self-harm, in which case we show crisis support instead of posting.

We send content only, never your identity. AI output is labelled and may be inaccurate. We don't use your data to train AI models. [Confirm against each provider's current API terms before publishing: Anthropic and OpenAI API data is not used for training by default.]

## Who can see what
- **Other users** never see who you are, how you voted or what you wrote, except that your reason may appear as an anonymous quote in a poll's results if you agree when voting.
- **Askers** see results, the AI summary and featured quotes, never individual votes or reasons. Counts that could single someone out are hidden: results need 10+ votes, rooms 3+ votes, and link-vote counts start at 3.
- **Close friends:** your circle owner sees how many friends are in it, never who.
- **Public result pages:** only when the asker turns them on. They show the split, the AI summary and the quotes voters agreed to share.
- **Universities you partner with through a campus community** receive totals only (e.g. number of polls, reports, and how often crisis support was shown), with numbers under 5 hidden.
- **Our moderators** can see content and the internal account ID linked to it when handling reports and appeals.

## AI assistants (ChatGPT, Claude)
If you connect Opinion to an AI assistant, the assistant can post polls on your behalf (after asking you) and read your polls' results. You authorise this with your Opinion sign-in and can revoke it at any time. Your assistant provider's own privacy policy applies to your conversation with it.

## Processors
- [Supabase]: hosting and database.
- [Anthropic]: AI summaries, second opinion, safety checks.
- [OpenAI]: moderation.
- [RevenueCat]: subscription status.
- [Apple] and [Google]: sign-in, payments, push, app integrity.
- [Expo]: push notifications.
- [Resend]: email.
- [PostHog]: analytics, EU.
- [Sentry]: crash and performance reports.
- [Vercel]: website.

International transfers rely on [EU–US Data Privacy Framework / Standard Contractual Clauses].

## Retention
| Data | Kept |
|---|---|
| Account data | Until you delete your account |
| Raw reason text | 90 days after the poll closes (featured quotes kept, anonymised) |
| Poll results | For the asker's history; unlinked from deleted accounts |
| Decision journal notes, decisions, AI second opinion | Until you delete the account (removed on deletion) |
| Notifications | 60 days |
| "Need more info" requests and link invitations | 90 days after the poll closes |
| Rooms and room votes | 1 day after the room closes |
| Reports, moderation records and appeals | 2 years |
| Integrity and AI-quality flags | 1 year |
| Crisis-support counts (no identity) | 2 years |
| Backups | Up to 30 days |

## Your rights
Access, correction, deletion, portability, objection and complaint to your data protection authority.
- **See what we hold:** Settings → What Opinion knows about me.
- **Download your data:** Settings → Download my data.
- **Delete your account:** Settings → Delete account.
- **Anything else:** contact [privacy@domain].

## Age
Opinion is only for people aged 18 and over. We delete accounts we learn belong to someone younger.

## Changes
We'll notify you in the app before material changes take effect.
