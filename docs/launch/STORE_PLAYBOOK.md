# Store playbook (Phase 3)

Work in App Store Connect and Google Play Console that needs no code. Sources and reasoning are in [GROWTH_RETENTION_RESEARCH.md](../research/GROWTH_RETENTION_RESEARCH.md) §D.

## 1. Custom product pages (App Store, up to 70)
Each gets its own screenshots and promo text, and its URL is used in that audience's ads, posts and QR codes.

| Page | For | Promo text (170 chars max) | First 3 screenshots |
|---|---|---|---|
| `students` | Campus launches, posters, ambassador links | Torn between two choices? Ask students on your campus. Anonymous votes, real reasons, an AI summary of both sides. | Campus feed · result story · close friends |
| `career` | LinkedIn and Reddit career posts | Two offers, one decision. Ask people who work in the field, see why they'd choose, and decide with confidence. | Expert poll · verified experts line · decision journal |
| `shopping` | TikTok and Instagram shopping content | Which one should you buy? Real people vote and say why. Results in hours, not days. | Image poll · verdict label · story share card |
| `friends` | Close friends and "decide together" posts | Where should we eat? Which outfit? Ask your close friends; everyone votes anonymously. | Circle · friends-only poll · result |

Google Play has an equivalent: **custom store listings** per country or campaign.

## 2. In-App Events (up to 31 days each, also reach people who already have the app)
| When | Event | Card text |
|---|---|---|
| Late Aug – Sep | **Course & housing season** | Picking modules or flatmates? Ask the people who've been there. |
| Nov – Dec | **Exam season: study smarter** | Which revision method actually works? See what your campus says. |
| Jan | **New year, big decisions** | Job, city, course: get real reasons before you commit. Your decision journal tracks how it turns out. |
| Feb | **Valentine's: should I?** | Anonymous advice for the awkward questions. |
| Mar – Apr | **Internship offers** | Two offers? Ask people in the field. |

Each needs a 1080×1920 card image and short text. Use In-App Events to promote the **daily question** themes for that period.

## 3. Featuring nomination (App Store Connect → Featuring Nominations)
Submit about 3 months before the launch date (minimum 2 weeks). Draft:

> **Opinion: decide with real reasons, not likes.** Opinion helps young adults make everyday and life decisions by asking real people, anonymously. Every vote comes with a reason, results are revealed once as a story, and an AI summary, labelled and citing voters' own words, lays out both the majority and minority view. Built with iOS 26 Liquid Glass, Live Activities for your live poll, a Home Screen widget for the daily question, full VoiceOver and Dynamic Type support, and privacy at its core: no public profiles, no likes, no ads, no data selling, crisis support built in.

Attach: 30-second app preview, the accessibility statement, and privacy nutrition labels.

## 4. Ratings
The in-app rating prompt is already built (happy moments only; see `lib/review.ts`). Reply to every review under 4 stars within 48 hours, and turn recurring complaints into roadmap items.

## 5. Before submitting
- [ ] Replace `opinion.example` with the real domain (app.json, `lib/legal.ts`, web well-known routes).
- [ ] Set `APPLE_TEAM_ID`, `ANDROID_CERT_SHA256`, `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL` on the website.
- [ ] Opinion+: create the subscription products in both stores, connect them in RevenueCat, set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` in the app and `REVENUECAT_WEBHOOK_SECRET` on Supabase, and point the RevenueCat webhook at `/functions/v1/revenuecat`.
- [ ] Review the machine-drafted translations in `apps/mobile/src/locales/` with native speakers.
- [ ] Have helpline numbers in `components/crisis-support.tsx` checked for each launch country.
