# Opinion: growth, retention and "decision companion" research (2026-10-02)

Goal: make Opinion something people come back to whenever they face a choice: useful, trusted, a little fun, and worth telling friends about. This note summarises web research and maps it onto what the app already has.

## 1. What the research says

### Retention benchmarks and what moves them
- **Benchmarks.** Social apps typically keep about 40–50% of users on day 1, 20–30% on day 7 and 10–20% on day 30. Social is the stickiest category because friends keep each other there. Our spec target of 60/40/25 is ambitious. ([UXCam](https://uxcam.com/blog/mobile-app-retention-benchmarks/), [MWM](https://mwm.ai/glossary/retention), [a16z](https://a16z.com/the-stickiest-most-addictive-most-engaging-and-fastest-growing-social-apps-and-how-to-measure-them/))
- **The first session matters most.** Users who do something meaningful in their first session retain 2–3× better. Social apps that don't connect a user to 3 or more friends in session one lose 60–70% of them by day 7. ([Trophy](https://trophy.so/blog/mobile-app-engagement-strategies))
- **Speed to the payoff.** The first meaningful action should come within about 60 seconds, and the first real value within 10 minutes. Never put a paywall before that moment. ([Digia](https://www.digia.tech/post/mobile-app-onboarding-activation-retention/), [Appcues](https://www.appcues.com/blog/8-user-onboarding-strategies))

### Habits
- **The Hook model.** Habits form through a loop: trigger → action → variable reward → investment. The goal is for an *internal* trigger (here, "I'm torn about something") to start the loop instead of a notification. ([Amplitude](https://amplitude.com/blog/the-hook-model)) Critics warn this can build compulsion rather than value. ([Yu-kai Chou](https://yukaichou.com/gamification-analysis/hook-model-octalysis-habit-addiction/))
- **Streaks (Duolingo).** Users with a 7-day streak retain 2.4× better. Streak freezes and repairs keep people from quitting after one miss, and a "Streak Wager" lifted day-7 retention by 14%. ([Duolingo blog](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/), [AcademicJobs](https://www.academicjobs.com/global/global-news/how-online-language-learning-streaks-supercharge-user-motivation-and-retention-108))
- **Home-screen widgets and Live Activities.** Interactive widgets get about 3× the engagement of static ones. Apps using Live Activities show about 24% higher 30-day retention. Locket grew as a widget-first app for close friends. Expo supports iOS widgets and Live Activities as stable from SDK 56; we're on 57. ([Forasoft](https://www.forasoft.com/blog/article/9-tips-to-make-ios-app-cooler-86), [Expo blog](https://expo.dev/blog/ios-widgets-and-live-activities-in-expo), [Substack: widget effect](https://neoads.substack.com/p/the-widget-effect))

### Notifications
- **Opt-in and personalisation.** About 51% of iOS users and 81% of Android users opt in. Asking in context, after a moment of value, raises that to 65–75%. Personalised pushes get about 20% engagement against a 7% average. ([Pushwoosh](https://www.pushwoosh.com/blog/push-notification-best-practices/), [vmobify](https://vmobify.com/blog/push-notification-strategy))
- **Frequency.** 46% of users opt out after 2–5 irrelevant messages a week. Keep non-urgent pushes to 3–5 a week. Users who get at least one relevant push in their first 90 days retain about 3× better. ([Flowium](https://flowium.com/blog/push-notification-best-practices/))

### Advice and decision psychology (the core need)
- **People default to deciding alone.** In a 12-country study of 3,517 adults, only 9–19% chose friends' advice and 3–16% the crowd as the wisest approach, even though advice usually improves decisions. Opinion has to make advice feel easy, safe and clearly useful. ([Royal Society B](https://royalsocietypublishing.org/rspb/article/292/2052/20251355/234598/Decision-making-preferences-for-intuition), [Phys.org](https://phys.org/news/2025-08-people-disregard-advice-tough-decisions.html))
- **Asking many people can backfire** when advisors feel ignored. Our anonymous, aggregated format avoids that social cost. ([HBR](https://hbr.org/2019/05/how-asking-multiple-people-for-advice-can-backfire))
- **Tracking decisions and outcomes improves judgment over time.** This is the habit "superforecasters" share. ([Atlassian](https://www.atlassian.com/blog/productivity/decision-journal), [Farnam Street method](https://blog.mylifenote.ai/decision-journal-template-track-outcomes-improve-choices/))

### Gen Z context
- **Loneliness and peer trust.** 80% of Gen Z felt lonely in the past year. They trust peers' content 4.3× more than brands', and 53% search TikTok, Reddit or YouTube before Google, including for life advice. ([Grow Therapy](https://growtherapy.com/blog/gen-z-mental-health-statistics/), [ContentGrip](https://www.contentgrip.com/tiktok-trends-gen-z-marketing-guide/), [Truffle](https://www.truffleculture.com/gen-z-trends-2026-cultural-analysis/))
- **Anonymity drives posting.** On Fizz, about 30% of weekly users post, against about 1% on typical platforms. ([Colgate Maroon-News](https://thecolgatemaroonnews.com/41483/commentary/is-fizz-the-new-yik-yak-2/))
- **Gen Z pays for social apps.** 23% of Gen Z pay for a social subscription such as Snapchat+ or X Premium, about twice the general rate. ([Bango](https://bango.com/gen-z-now-pays-for-its-social-media-fix/))

### "Companion" apps: the opportunity and the risks
- **Huge engagement.** Character.AI reports 20M+ monthly users and about 75–90 minutes a day. 60% of users feel attached, but about 25% report addiction-like dependence. ([Carla Kaas](https://carlakaas.com/blog/ai-companion-statistics), [Globe Market Research](https://www.globemarketresearch.com/statistic/ai-companion-app-statistics))
- **New laws.** New York's AI Companion law (in force Nov 2025) and California SB 243 (Jan 2026) apply to emotionally responsive chatbots. They require:
  - telling users they're talking to an AI, and repeating it every 3 hours;
  - a protocol for detecting self-harm and referring people to crisis services;
  - (California only) private lawsuits of $1,000 or more per violation.

  ([Davis Polk](https://www.davispolk.com/insights/client-update/california-and-new-york-launch-ai-companion-safety-laws), [Orrick](https://www.orrick.com/en/Insights/2026/04/2026-State-Chatbot-Laws-Key-Provisions-and-Regulatory-Trends), [Jones Walker](https://www.joneswalker.com/en/insights/blogs/ai-law-blog/ai-regulatory-update-californias-sb-243-mandates-companion-ai-safety-and-accoun.html?id=102lq7c))
- **Addictive design.** The EU's planned Digital Fairness Act (proposal expected in 2026) targets addictive design and dark patterns, and the FTC keeps bringing dark-pattern cases. ([European Parliament](https://www.europarl.europa.eu/legislative-train/theme-protecting-our-democracy-upholding-our-values/file-digital-fairness-act), [Osborne Clarke](https://www.osborneclarke.com/insights/digital-fairness-act-unpacked-dark-patterns))

**Conclusion:** be a *decision companion* that is always useful, not an *emotional companion* chatbot. Opinion's value is real people's reasons, and the AI only organises them. That keeps us out of the companion-chatbot laws and avoids the dependence problem, while still being the place people turn to when they're torn.

### App Store visibility
- **Featuring.** Nominate the app in App Store Connect about 3 months ahead. Editors look for native design, accessibility, privacy and a clear story. ([AppTweak](https://www.apptweak.com/en/aso-blog/how-to-get-your-app-featured-on-the-app-store), [Kickstart](https://www.kickstart.tools/blog/how-to-get-featured-on-the-app-store-nominations-timing-and-what-editors-want))
- **In-App Events** last up to 31 days and also reach people who already have the app. Up to 70 custom product pages let us show a different store page to each audience. ([Adapty](https://adapty.io/blog/custom-product-pages-app-store/))

## 2. Where Opinion stands

**Strong already:**
- anonymous, view-once results and AI summaries that cite voters' reasons;
- vote-to-ask credits, a forgiving weekly streak and decision outcomes;
- follow-ups, friend links and referrals, campus launch progress;
- moderation and appeals.

**Gaps against the research:**
1. **No daily reason to open the app.** Polls arrive at random; there's no shared daily moment.
2. **Nothing on the home or lock screen.** A live countdown and vote count suits Live Activities perfectly.
3. **The asker's journey ends at the result.** There is no decision history or "how did it turn out?" after 30 days, so users invest nothing over time.
4. **No crisis safety net.** A question like "should I end it" is only caught by moderation after the fact.
5. **No notification budget.** Digest, last calls, boosts, follow-ups and outcomes could add up to more than 5 a week.
6. **Discovery is closed.** Nothing is searchable on Google or TikTok, where Gen Z looks for advice.
7. **No standing group of close friends.** Friend links are one-off.
8. **No paid tier.**

## 3. Recommendations, by impact

| # | Build | Why (evidence) | Size |
|---|---|---|---|
| 1 | **Crisis safety net**: detect self-harm in questions and reasons, block the poll, show crisis resources; extra-careful wording on sensitive topics | Basic duty of care; mandatory if anything companion-like ships (NY/CA); App Store safety | S |
| 2 | **Decision journal**: a private timeline of every decision (question → crowd → what you chose → 30-day check-in "glad you did?") with personal patterns ("you're happiest when you follow your gut on taste questions") | Investment step of the Hook model; outcome tracking improves judgment; builds on the existing decision outcomes | M |
| 3 | **Daily question**: one shared poll each day (global, plus per campus) that closes after 24h, with yesterday's result as the morning reward | Gives a daily reason to open the app with a fresh reward each time, BeReal-style; a topic people talk about on campus | M |
| 4 | **Live Activity and widget** for your own poll (votes so far, time left), plus a widget for the daily question | About 24% higher day-30 retention; Expo supports it from SDK 56 | M (native) |
| 5 | **Notification budget**: at most 4 non-urgent pushes a week per person, sent at their usual hour; ask for push permission after the first vote | Opt-outs rise with irrelevant pushes; asking in context raises opt-in to 65–75% | S |
| 6 | **Close friends circle**: up to 20 friends who get your friends-only polls automatically | Locket and close-friends habits; network effects are the biggest retention driver | M |
| 7 | **"Think it through" assistant** before posting: AI suggests clearer wording, missing options and what matters to you, labelled as AI with no persona | Better questions lead to better results and a quicker payoff; companion-like help without the companion risk | S–M |
| 8 | **Public result pages** (asker opts in): anonymised result plus AI summary on the web and as vertical video or story cards, for Google and TikTok search | Discovery where Gen Z looks for advice; trust in peer content | M |
| 9 | **Store work**: custom product pages for students, careers and shopping; In-App Events for exam season and housing season; a featuring nomination | Free acquisition and re-engagement | S (no code) |
| 10 | **Opinion+** (after users have had their first result): monthly boosts, verified-experts-only audiences, deeper AI analysis, journal insights and export | 23% of Gen Z already pay for social subscriptions | M + store setup |

**Guardrails for all of the above:**
- Show no loss-framed streak messages and no fake urgency.
- Show "You're all caught up" instead of endless scrolling.
- Never sell attention.
- Keep these choices documented; they protect us under the Digital Fairness Act, FTC rules and App Store review, and they are part of why people would trust Opinion.

## 4. Suggested next batch
Items **1, 2, 3 and 5**: the safety net, the decision journal, the daily question and the notification budget. All four can be built now with no accounts. Item 4 needs a native build with an App Group, and 10 needs the store accounts.

---

# Round 2: deeper research across every area (2026-10-03)

The first round covered retention, habits and the companion question. This round goes area by area: experience, features, trust, public discovery, re-engagement, platform integrations, accessibility and law, international, performance and revenue. Each finding is checked against the current code.

## A. Experience and look and feel
- **The new native look.** iOS 26 Liquid Glass (translucent, depth, motion) and Android's Material 3 Expressive (bold colour, playful shapes) set what "premium" means now. Users say Liquid Glass makes iOS feel premium again. ([Android Central](https://www.androidcentral.com/apps-software/android-os/android-16-material-3-expressive-vs-ios-26-liquid-glass), [Apple](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/))
  - *Opinion today:* NativeTabs and `expo-glass-effect` are already installed, so the tab bar gets glass for free.
  - *Gap:* sheets, the vote-screen header and the share card don't use the glass material yet, and the Android side doesn't use Expressive.
- **Small delights.** Brief animations or haptics under 300ms make an app feel premium, but they should be tied to real value, never used to stretch time spent. ([IxDF](https://ixdf.org/literature/article/micro-interactions-ux), [Medium: haptics](https://medium.com/@chandra.welim/haptic-feedback-the-secret-to-apps-that-feel-premium-7463fdc1ccca))
  - *Gap:* we use haptics on vote and reveal but have no shared haptic vocabulary. Rare moments should feel different: matching the majority, being quoted, an asker going with your pick.
- **Verdict labels (from r/AmItheAsshole, 24.5M members).** A fixed vocabulary of answers (YTA, NTA, ESH, INFO) and an "official" verdict after 18 hours turn advice into a ritual. INFO ("I need more information") is especially useful. ([Wikipedia](https://en.wikipedia.org/wiki/R/AmItheAsshole), [CBC](https://www.cbc.ca/radio/sunday/reddit-community-1.7059122))
  - *Gap:* add an optional **"Need more info"** vote. It wouldn't count towards any option; once enough people pick it, the asker is prompted to post a follow-up with context.
  - *Gap:* give a **verdict label** at close ("Clear call", "Split decision", "It depends"), based on how big the winning margin is.

## B. New features
- **Group decisions with friends.** Apps like Hangrily, ForkYes and Tonight's Bite settle "where shall we eat?" for a group in under 2 minutes, often with swipe voting. This is a different job from Opinion's (a decision for *us*, not for me), but friends-only polls and the planned close-friends circle nearly cover it. ([Hangrily](https://hangrily.app/dinner-decision-app), [ForkYes](https://apps.apple.com/us/app/forkyes-decide-together/id6759871715))
  - *Idea:* a **"Decide together"** mode. Everyone in the circle votes, the result shows live once all have voted, and it closes in 15 minutes to 3 hours. It's light and viral, and each use brings in new users.
- **Polls about pictures and voice.** Gen Z expects interactive formats: 46% engage with polls, quizzes and Q&As. Visual and voice search are growing. ([Sociallyin](https://sociallyin.com/gen-z-social-media-usage-statistics/))
  - *Opinion today:* image options exist.
  - *Gaps:* dictating your reason (the phone keyboard already allows this, so we only need to hint at it); and a short **voice reason** is a possible later feature, but it brings moderation and privacy costs, so park it.
- **Decision journal and 30-day check-in.** From round 1, still the biggest feature for building a long-term habit.

## C. Trust, integrity and AI
- **Bots and fake accounts.** CAPTCHAs, honeypots, server tokens and SMS checks help. Graph-based detection of coordinated voting is the state of the art. ([NCBI: bot-compromised survey](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12415786/), [arXiv: Sybil detection](https://arxiv.org/html/2311.17929v7))
  - *Opinion today:* App Attest and Play Integrity, rate limits, 24h credit delays, campus email checks.
  - *Gap:* nothing detects groups of accounts voting together, e.g. many fresh accounts voting the same side on the same poll within minutes. Add a nightly job that flags these for admin review; votes are never auto-deleted.
- **Trust in AI summaries.** Citations raise trust, but explanations can also create *false* confidence. ([arXiv: citations and trust](https://arxiv.org/pdf/2501.01303), [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0952197626021780))
  - *Opinion today:* summaries cite real quotes and have a fairness pass.
  - *Gap:* let readers flag a summary as "inaccurate" in one tap, feeding the admin AI-quality queue; and show a plain "AI can miss nuance, read the quotes" line next to it.
- **Earned trust levels (Discourse).** New members earn rights by reading and taking part, and the community helps moderate. Highlighting good contributions raises quality. ([Discourse](https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/))
  - *Idea:* **voter reputation**, private and never public, built from reasons that get featured or marked helpful, accurate predictions and no upheld reports. Use it to:
    - give more weight to reliable voters' reports;
    - favour their quotes as featured candidates;
    - later, offer "trusted voter" audiences in Opinion+.

## D. Public face and discovery
- **Store presence.** Featuring nominations about 3 months ahead, In-App Events, up to 70 custom product pages. ([AppTweak](https://www.apptweak.com/en/aso-blog/how-to-get-your-app-featured-on-the-app-store), [Adapty](https://adapty.io/blog/custom-product-pages-app-store/))
- **Ratings.** Ask at a happy moment: after a good result, a featured reason or a matched decision. Only ask users who are 7+ days in with several sessions, and at most 3 times a year (Apple's cap). The North Face went from 3.68 to 4.23 stars by asking at the right time. ([AppTweak](https://www.apptweak.com/en/aso-blog/tips-to-manage-app-store-reviews), [SwiftLee](https://www.avanderlee.com/swift/skstorereviewcontroller-app-ratings/))
  - *Gap:* we never ask. Add `expo-store-review` with these rules.
- **App Clip (iOS).** Friend links could open a lightweight App Clip that lets people vote *without installing*. This can lift conversion by 35–50%. Android Instant Apps are being retired, so Android uses the web page plus an install. ([Linkrunner](https://linkrunner.io/blog/app-clips-android-instant-apps-deep-linking-strategy-2026))
  - Needs native work: a separate target and a size limit. Do it later, after the first universal links work.
- **Siri and Spotlight (App Intents).** Since WWDC26, App Intents is the only way Siri, Spotlight, Shortcuts and Apple Intelligence reach apps. ([Apple WWDC26](https://developer.apple.com/wwdc26/guides/apple-intelligence/), [Johnny Bytes](https://www.johnnybytes.com/en/blog/app-intents-how-your-ios-app-becomes-part-of-siri-spotlight-and-apple-intelligence/))
  - *Idea:* intents like "Ask Opinion…" (start a draft), "Vote on today's question" and "How's my poll doing?". Users could then say "Hey Siri, ask Opinion which offer to take."
- **Public result pages and vertical share video** (round 1, item 8) are still the main way to be found on Google, TikTok and Reddit.

## E. Bringing people back
- **When to win people back.** Users gone 7 days come back 20–30% of the time, users gone 30 days 5–15%, and after 90 days under 5%. Sequences at day 3, 7 and 14 recover 10–25%. Grouping lapsed users by *why* they left beats grouping by how long they've been gone. The first 90 seconds after someone returns decide whether they stay. Winning a user back costs about a fifth of acquiring a new one. ([MWM](https://mwm.ai/glossary/re-engagement), [Helpshift](https://www.helpshift.com/blog/re-engagement-campaigns-for-mobile-games/), [vmobify](https://vmobify.com/blog/push-notification-strategy))
  - *Gap:* nothing targets lapsed users. Add a **return path**:
    - day 3: "3 polls in your topics are closing soon";
    - day 7: "the result of a poll you voted on is ready" (if one is);
    - day 14: a single "we saved you a seat" message;
    - then stop.
  - On return, show a **"While you were away"** card: results waiting, quotes featured, asker decisions.
- **Notification budget** (round 1, item 5) caps all of this.

## F. Accessibility and law
- **European Accessibility Act.** It has applied since June 2025, with app criteria tightening from the end of 2026 (EN 301 549 and WCAG 2.1 AA). Requirements include screen-reader labels, Dynamic Type, Reduce Motion and Bold Text. ([Level Access](https://www.levelaccess.com/blog/eu-accessibility-requirements-and-eaa-compliance/), [Digital Barrierefrei](https://www.digitalbarrierefrei.at/en/understanding/accessibility-criteria/criteria-for-apps-from-end-of-2026))
  - *Opinion today:* labels throughout, a Reduce Motion fallback, contrast tests on our colours.
  - *Gaps:*
    - test at the largest text sizes (the split bar, option tiles and the bento grid may clip);
    - publish an accessibility statement on the website;
    - run one VoiceOver and TalkBack test of the full journey before launch.
- **Companion-chatbot laws, the Digital Fairness Act and dark patterns** are covered in round 1. They're the reason for "decision companion, not emotional companion".

## G. International growth
- **Where downloads are growing.** iOS paid installs grew in Mexico (+426%), Brazil (+157%), India (+118%) and Indonesia (+102%). Localised apps get about 128% more downloads per country, and social apps grow about 5× faster when the content is local. ([AppsFlyer](https://www.appsflyer.com/resources/reports/top-5-data-trends-report/), [Appscreens](https://appscreens.com/blog/what-languages-should-i-localize-my-app-into))
  - *Opinion today:* English only; strings are hard-coded and `expo-localization` is installed but unused.
  - *Plan:* move strings into an i18n file now while the app is small, even before translating. Translate later in this order: Spanish (Mexico), Portuguese (Brazil), Hindi, Indonesian.
  - **AI summaries should come out in the voters' language.** Our model can do this; communities and categories would be per locale.
  - Campus-first launches usually stay in one country for the first year, so this is preparation rather than a launch task.

## H. Performance
- **Fast to open.** React Native's New Architecture with Hermes typically cuts startup by about 40–50%; apps reach a usable screen in about 1.8s. ([ImpactTechLab](https://impacttechlab.com/react-native-new-architecture-app-performance/))
  - *Opinion today:* SDK 57 runs the New Architecture, Hermes and the React Compiler, and the feed is cached offline.
  - *Gap:* we don't measure it. Add Sentry performance traces for cold start, feed loaded and vote submitted, and aim for under 2 seconds to a usable feed on mid-range Android.

## I. Revenue
- **Consumers.** 23% of Gen Z pay for social apps. Show a paywall only after the first result has landed. ([Bango](https://bango.com/gen-z-now-pays-for-its-social-media-fix/), [Digia](https://www.digia.tech/post/mobile-app-onboarding-activation-retention/))
- **Businesses.** Paid survey panels charge from about $0.95 per response (Pollfish). Panels with quality controls, such as Attest and Prolific, charge more. ([Koji](https://www.koji.so/blog/pollfish-alternatives-2026), [PickFu](https://www.pickfu.com/blog/prolific-alternatives))
  - *Opinion's edge:* verified students and experts who give *reasons*. Selling "Campus Pulse" polls to brands, clubs and universities is a strong later business. It must stay opt-in for voters, clearly labelled "Sponsored question", and paid in credits or perks.

## Master roadmap (both rounds)

**Phase 1 (code only):**
1. Crisis safety net.
2. Notification budget plus asking for push permission after the first vote.
3. Rating prompt at happy moments.
4. Return path for lapsed users, plus the "While you were away" card.
5. Daily question.
6. Decision journal with a 30-day check-in.
7. "Need more info" vote and verdict labels.
8. Flag-the-summary button and the "AI can miss nuance" line.
9. Coordinated-voting detection for admins.
10. Move strings into an i18n file.
11. Performance traces.

**Phase 2 (some native work):**
12. Live Activity and widgets.
13. Close friends circle and "Decide together".
14. App Intents for Siri and Spotlight.
15. Glass material on sheets and the share card; Material 3 Expressive accents on Android.
16. Public result pages and vertical share video.
17. Private voter reputation.

**Phase 3 (needs accounts or contracts):**
18. App Clip.
19. Opinion+ subscription.
20. Store custom product pages, In-App Events and a featuring nomination.
21. Campus Pulse business polls.
22. Translations into Spanish, Portuguese, Hindi and Indonesian.

**What we keep refusing:**
- public follower counts or likes;
- live percentages before a poll closes;
- an emotional AI persona;
- loss-framed streaks or fake urgency;
- infinite feeds of polls you can't act on;
- selling personal data.

These are Opinion's position, not limitations.
