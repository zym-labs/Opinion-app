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
