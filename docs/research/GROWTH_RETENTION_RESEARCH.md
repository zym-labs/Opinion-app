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

---

# Round 3: broad research for the next stage (2026-10-03)

Rounds 1–2 shaped Phases 1–3, which are now built. This round looks wider at:
- why earlier anonymous apps failed;
- how people now use AI for advice;
- companion, journaling and offline-friendship apps;
- decision science;
- creator-led growth and AI assistants as a distribution channel;
- subscriptions, privacy, moderation and design trends.

Each finding is mapped to what Opinion has today and what to build next.

## 1. The big picture: people want real humans, and they're asking AI anyway
- **AI is already the advisor.** About half of ChatGPT use is asking for advice or recommendations. 27% of US adults use AI for personal, emotional or social questions. Over 40% of Gen Z ChatGPT users have asked it for career advice. ([Washington Post](https://www.washingtonpost.com/technology/interactive/2026/09/02/27-us-adults-turn-ai-personal-emotional-social-queries/), [Pew](https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026-chatbots-smart-devices-and-views-on-impact/), [Benton](https://www.benton.org/headlines/here%E2%80%99s-what-data-says-people-ask-chatgpt))
- **But human perspectives are gaining value.** Trust in Reddit is rising, people add "Reddit" to searches to get human answers, and Reddit's CEO says that "as AI becomes more prevalent, people increasingly seek out real human perspectives". ([Siege Media](https://www.siegemedia.com/research/reddit-sentiment), [CX Today](https://www.cxtoday.com/community-social-engagement/reddit-human-first-ai-customer-experience/))
- **AI advice differs from human advice.** UCLA found ChatGPT's life advice to young adults often differed from what 300+ people advised, and that difference widens the options people consider. ([UCLA Anderson](https://anderson-review.ucla.edu/ai-asked-for-life-advice-for-young-adults-doesnt-just-echo-what-humans-recommend))
- **Decisions are exhausting.** 86% of Gen Z report "menu anxiety". 55% are delaying major life decisions. Too much choice cuts action sharply (in one test, 28% acted with 6 options against 4% with 24). ([Yahoo/Prezzo](https://finance.yahoo.com/news/86-gen-z-experience-menu-163353427.html), [Deloitte](https://www.deloitte.com/global/en/issues/work/genz-millennial-survey.html), [SpeakWise](https://speakwiseapp.com/blog/decision-fatigue-statistics))

**Positioning:** *"Real people's reasons, organised by AI."* Opinion sits where AI advice and Reddit meet, and is anonymous, fast and judgment-free. Keep 2–4 options (choice overload is real). Offer AI as a *labelled second opinion*, never as a friend.

## 2. Lessons from anonymous apps that died
- **What killed them.** Yik Yak, Secret, Sarahah, NGL, Ask.fm and others failed over bullying, harassment and moderation they couldn't control. Hyper-local feeds made bullying feel physically threatening. Removing anonymity to fix it killed Yik Yak's growth. ([Failory](https://www.failory.com/cemetery/yik-yak), [Phys.org](https://phys.org/news/2017-05-anonymous-app-yik-yak.html), [IBTimes](https://www.ibtimes.com/secret-anonymous-app-shut-down-after-failing-attract-college-students-way-rival-yik-1902385))
- **Universities push back.** In 2024 the UNC system moved to block Yik Yak, Fizz, Sidechat and Whisper from campus Wi-Fi over "reckless disregard … indifference to bullying". ([Inside Higher Ed](https://www.insidehighered.com/news/tech-innovation/teaching-learning/2024/03/13/unc-system-banning-anonymous-social-apps-over), [Daily Tar Heel](https://dailytarheel.com/310802/university/university-anonymous-app-ban/))

**What already protects Opinion:**
- questions only, no free posting;
- 2–4 fixed options;
- reasons are moderated, with personal details removed;
- results only for 10+ voters;
- no comments or replies;
- no location feed;
- reports, appeals, crisis support and burst detection.

**Gaps:**
1. **Named people in questions.** A question like "Is Sam from Bio 101 annoying?" would pass ordinary moderation. Add a check that blocks questions about identifiable private people.
2. **Campus trust.** Offer universities a safety partnership: a published transparency report, a direct line to report problems, counselling-service helplines on the crisis card, and campus-level stats without personal data. That makes Opinion the anonymous app universities *recommend*, not ban.

## 3. Lessons from BeReal and the streak research
- **BeReal's fall.** Daily users fell about 61% from peak. The daily ping became a chore, users felt pressure to look interesting, and bringing in celebrities and brands broke the friends-first promise. ([Dazed](https://www.dazeddigital.com/life-culture/article/61166/1/why-did-bereal-fail-social-media-instagram-authenticity), [EM360](https://em360tech.com/tech-articles/what-happened-bereal-authenticity-obscurity), [Wikipedia](https://en.wikipedia.org/wiki/BeReal))
  - *For Opinion:*
    - the daily question must stay optional and varied, never a chore;
    - Campus Pulse needs a **frequency cap** (at most one sponsored question per person per week) so brands never crowd out friends;
    - keep celebrities out.
- **Streak anxiety.** All-or-nothing streaks are a top reason people quit habit apps (one study found 63% more abandonment after a single miss). 47% of people have deleted an app because it caused stress. Forgiving, weekly and milestone-based progress works better. ([Habit Doom](https://habitdoom.com/blog/streak-anxiety-habit-trackers), [Incogni](https://blog.incogni.com/digital-fatigue-and-burnout/), [Routinery](https://www.routinery.app/blog/micro-rewards-vs-streaks-adherence-science))
  - *For Opinion:* the weekly, forgiving streak is right. Add **milestones that aren't tied to time** ("100 opinions given", "helped 50 people decide") and frame them around the effect on others.

## 4. What makes people stay: motivation, not compulsion
- **Self-determination theory.** People stay with apps that support three needs: *autonomy* (choice and control), *competence* (clear progress and feedback) and *relatedness* (connection). Apps that meet them get higher ratings and keep people longer. ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1071581920300513), [ResearchGate](https://www.researchgate.net/publication/368760824_Self-Determination_Theory_and_Technology_Design))
  - *Autonomy:* topic choice, notification controls and opt-ins are in place. Add a **"What Opinion knows about me" privacy dashboard**.
  - *Competence:* predictions and the journal exist. Add a **calibration score** ("you predict the room 72% of the time").
  - *Relatedness:* circles exist. Add **"Your impact" recaps**: "This month your reasons helped 23 people decide, and 4 askers went with your pick." Make a shareable yearly **Opinion Wrapped**.
- **Journaling apps show reflection retains.** Rosebud's prompts, weekly AI insights and gentle streaks kept testers journaling 5 days in 7, against 2–3 for other apps. ([Rosebud](https://www.rosebud.app/), [MyLifeNote](https://blog.mylifenote.ai/ai-journaling-apps-compared/))
  - *For Opinion:* add a **monthly journal insight** (a short AI summary of your own decisions) and a few decision prompts.

## 5. Better decisions, not just faster ones
- **Independent votes make crowds wiser.** Even small social influence reduces a crowd's accuracy without adding to it (Lorenz et al., 2011). Opinion's sealed, view-once results protect independence; say so in marketing. ([ResearchGate](https://www.researchgate.net/publication/51130820_How_social_influence_can_undermine_the_wisdom_of_crowd_effect))
- **Bridging.** X Community Notes only shows notes rated helpful by people who usually disagree, which cut reposts of misinformation by 25–34%. ([PNAS](https://www.pnas.org/doi/10.1073/pnas.2503413122), [arXiv](https://arxiv.org/pdf/2510.09585))
  - *For Opinion:* pick featured quotes that were marked "this helped me" by **voters on both sides**. That surfaces reasons that are fair, not just popular.
- **Decision frameworks.** "10/10/10" (how will I feel in 10 minutes, 10 months, 10 years?) and regret minimisation help people weigh choices. Good process and good outcome are different things. ([Glasp](https://glasp.co/articles/regret-minimization-framework), [Decisions Matter](https://decisionsmatter.in/field-notes/regret-minimization-framework))
  - *For Opinion:* add an optional **"Think it through"** step to Create (private 10/10/10 notes, kept in the journal), and a journal line separating "good call" from "good luck".
- **Social-proof nudges.** They work mostly when people are unsure, and fake or inflated numbers destroy trust. ([NCBI](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7325907/))
  - *For Opinion:* only show real numbers, never live tallies, and never "people like you chose X" before someone has voted.

## 6. Growth channels
- **Creator content on TikTok** gets the cheapest installs for 18–35s. It wears out in about 7.6 days, so new videos are needed constantly. The first 3 seconds change cost per install 2–4×. Typical cost per install is $1.75–$4. Ambassador and creator programs are central. ([Moburst](https://www.moburst.com/ugc-best-practices-in-2026-what-the-data-actually-says-about-content-that-converts/), [vmobify](https://vmobify.com/blog/tiktok-app-install-campaigns), [Business of Apps](https://www.businessofapps.com/news/app-market-trends-2026/))
  - *For Opinion:* every result is ready-made content ("I asked 140 students if I should take the internship…"). Add **animated vertical video exports** of the result story, and run a campus ambassador program with codes (referrals exist).
- **Apps inside AI assistants.** ChatGPT has about 900M weekly users and an app directory built on MCP (Model Context Protocol). Apps appear inside conversations. ([VentureBeat](https://venturebeat.com/technology/openai-now-accepting-chatgpt-app-submissions-from-third-party-devs-launches), [Phiture](https://phiture.com/asostack/chat-gpt-app-directory/))
  - *For Opinion:* an **"Ask real people" app for ChatGPT and Claude**. When someone asks an AI "should I take job A or B?", the assistant offers to post it to Opinion and later fetches the human result. This could be the biggest distribution channel, and it fits "AI advice plus human perspective" exactly. It needs OAuth sign-in and strict rate limits.
- **Personalised onboarding.** A 3–5 question quiz that visibly changes the experience lifts conversion; under 3 questions feels generic and over 5 feels like a chore. ([Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/))
  - *For Opinion:* add a step **"What are you deciding about these days?"** (study, career, relationships, money, style, everyday). It should shape templates, the daily question and the feed order.

## 7. Being with people offline, and new areas
- **Offline is winning again.** Timeleft has gathered 3M+ people in 200+ cities, and 222 runs quiz-matched events. Game-based in-person events grew 400%. ([Timeleft](https://timeleft.com/blog/best-apps-to-make-friends/), [Fast Company](https://www.fastcompany.com/91265745/smartphones-are-making-people-lonely-this-app-thinks-it-has-the-cure), [YPulse](https://www.ypulse.com/newsfeed/2024/05/14/a-new-wave-of-apps-and-groups-are-focusing-on-in-person-events-to-combat-loneliness/))
  - *For Opinion:* a **Room mode** for a group in the same place (a party, a class, a club meeting). Show a QR code, everyone votes anonymously on their phone, and the result appears on one screen when all have voted. It's a fun, offline-first growth loop where every room brings in new users.
- **Relationship advice is a big unmet need.** About half of Gen Z use AI for their love lives, and "situationships" create constant small decisions. ([Medium/coto](https://medium.com/@cotoapp/5-best-apps-for-anonymous-relationship-advice-and-emotional-support-a2c805b844af), [Rolling Out](https://rollingout.com/2026/04/09/gen-z-situationships-no-label/))
  - *For Opinion:* a **Relationships** topic with extra safeguards: no names or screenshots, stricter moderation, and a "healthy relationships" resource link next to the crisis support.

## 8. Money, privacy, moderation, design
- **Subscriptions.** Social and lifestyle apps have the lowest monthly first renewal rate (42%). Long trials (17–32 days) convert about 70% better than short ones. ([RevenueCat](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026), [RevenueCat renewals](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category))
  - *For Opinion:* lead with an **annual plan** and a **14–30 day trial**, offered after the first result. Expect Campus Pulse to bring more revenue than consumer subscriptions.
- **Privacy is a reason to choose an app.** 81% of Gen Z worry about privacy, only 14% fully trust platforms, and 69% of consumers want only necessary data collected. 41% would trust more with clear explanations. ([Data Folio3](https://data.folio3.com/blog/data-privacy-stats/), [Usercentrics](https://usercentrics.com/magazine/articles/gen-z-wants-transparency-not-hyperpersonalization/))
  - *For Opinion:* the privacy dashboard, plus "we never sell data, never show who voted" said clearly in the store listing and onboarding.
- **Moderation.** Google's Perspective API shuts down on 31 Dec 2026; we already use OpenAI's moderation. Language models can now catch context-based abuse such as targeting a person. ([Mixpeek](https://mixpeek.com/curated-lists/best-ai-content-moderation-tools), [Digital Applied](https://www.digitalapplied.com/blog/ai-content-moderation-2026-llm-trust-safety-guide))
- **Design and brand.** Partiful grew about 400% year on year with humorous, casual, good-looking design and a witty brand voice. The 2026 Apple Design Awards rewarded Delight and Fun, Inclusivity, Interaction and Social Impact; Opinion fits Social Impact and Inclusivity. ([CNBC](https://www.cnbc.com/2025/04/19/meet-partiful-the-gen-z-party-planning-staple-thats-taking-on-apple.html), [Apple](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/))
  - *For Opinion:* a **playful brand voice** in empty states and loading text, seasonal themes for the daily question, and shareable result cards worth posting.

## Roadmap after round 3

**Phase 4 (code only, buildable now):**
1. Bridging-based featured quotes: favour quotes marked helpful by voters on both sides.
2. Personalisation step in onboarding ("What are you deciding about?") that shapes templates, the daily question and the feed.
3. "Think it through" in Create (private 10/10/10 notes) and decision-quality reflection in the journal.
4. AI second opinion after results: clearly labelled, shown next to the human result, never instead of it, no persona.
5. "Your impact" monthly recap, milestones not tied to time, and a calibration score.
6. "What Opinion knows about me" privacy dashboard.
7. Room mode: in-person group decisions by QR code.
8. Safety: block questions about identifiable private people; cap sponsored questions at 1 per person per week; a public transparency report page.

**Phase 5 (bigger builds):**
9. An Opinion app for ChatGPT and Claude, with OAuth and rate limits.
10. Animated vertical video export of results.
11. A Relationships topic with extra safeguards.
12. Campus safety partnership program and a university dashboard (totals only).
13. Opinion+ annual plan with a trial.
14. Opinion Wrapped (yearly shareable recap).

**Phase 6 (outside the app):**
- campus ambassador and creator program;
- full translations;
- offline "Opinion Nights" on campuses;
- Campus Pulse sales.
