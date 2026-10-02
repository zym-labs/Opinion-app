# Reference App UI/UX Patterns for Opinion

Context: Opinion is an app of anonymous 2-option decision polls. Voters give short reasons, results are revealed once after close with an AI summary, credits are earned by voting and spent on asking, and there are no followers or likes. It launches with 18+ college students. Research budget was about 12 tool calls, so most sources are secondary (blogs and teardowns). Treat the statistics as directional.

## Voting / choice UIs (Gas, BeReal, Polymarket, Hinge, Tinder, Wordle)

### Takeaway
The best low-friction choice UIs share four traits: one prompt per screen, very few options to tap, content curated by the platform, and a scarce or timed rhythm. For Opinion, the most useful models are Gas (one prompt card, tap an answer, move to the next) and Polymarket (a card showing a big percentage and a 2-color Yes/No bar).

### Cited Findings
- Gas showed one prompt per screen with four friend names, and the user tapped one. The voter stayed semi-anonymous because only their gender was revealed. — [EdWeek](https://www.edweek.org/technology/gas-is-the-latest-app-to-catch-fire-with-kids-what-you-need-to-know-about-it/2022/12); [Wikipedia](https://en.wikipedia.org/wiki/Gas_(app))
- Gas wrote every prompt itself and kept them positive. It showed names more often when a user hadn't received compliments recently, and claimed over 95% of users who added friends got a compliment on their first day. — [Wikipedia](https://en.wikipedia.org/wiki/Gas_(app)); [Yahoo/News](https://www.yahoo.com/news/teens-love-anonymous-gas-app-142933976.html)
- Discord shut Gas down about 9 months after buying it. Interest in Gas was described as short-lived. — [TechCrunch](https://techcrunch.com/2023/10/19/discord-kills-gas-anonymous-compliments-app-bought-nine-months-ago/); [Berkeley High Jacket](https://berkeleyhighjacket.com/2023/features/gas-app-captures-short-lived-attention-of-social-media-users)
- A Cornell expert warned that compliment apps for teens could backfire. A CBC expert said Gas "monetizes their anxiety". — [Cornell](https://news.cornell.edu/media-relations/tip-sheets/new-app-based-complimenting-others-could-backfire-teens); [CBC](https://amp.cbc.ca/lite/story/1.6718229)
- Polymarket market card anatomy: a 40px rounded thumbnail, a title, a large probability percentage, and Yes/No buttons colored green and red. Charts are simple lines with no extra indicators. Hierarchy comes from color saturation on a near-black canvas, not from size. — [Avark Agency](https://avark.agency/learn/prediction-market-design-patterns); [designmd.co](https://www.designmd.co/d/polymarket-com)
- Polymarket's card pattern makes browsing markets "feel like scrolling a news feed". — [Finextra](https://www.finextra.com/blogposting/31216/polymarket-mobile-app-design-uiux-features-that-drive-engagement-amp-trust)
- BeReal sends one notification a day at a random time, gives a 2-minute window, allows one post per day, and uses reciprocal posting (you must post to see friends' posts). An HCI paper says this design reduces self-presentation pressure. — [arXiv 2408.02883](https://arxiv.org/html/2408.02883v1); [Wikipedia](https://en.wikipedia.org/wiki/BeReal)
- Wordle's share grid is spoiler-free: colored squares show performance without revealing the answer. Users invented it, and Wardle then built it into the game. The game went viral after the share button was added. — [Josh Wardle on X](https://x.com/powerlanguish/status/1471493886031773707); [Wikipedia](https://en.wikipedia.org/wiki/Wordle)

### Inferences
- **Vote card:** show one decision per screen, with two large thumb-reachable halves (A/B) and a single tap to commit. After the tap, the "why?" box slides up as an optional 1-line field with chip suggestions, so voting itself stays a single tap.
- BeReal's reciprocity gate maps directly onto vote-to-ask credits: you contribute before you get. Explain this framing as "give 3 opinions, get 1 ask" rather than hiding it.
- Spread votes deliberately, as Gas did for compliments. Route voters toward polls with few votes so every asker gets enough votes. This is the Opinion version of "95% get a compliment on day 1".
- Gas's fast collapse suggests novelty-driven anonymous apps churn quickly. Opinion's utility loop (a real decision answered) should be the core, with delight layered on top.
- **Shareable result card:** show the A/B split and the AI one-liner, but not the identity of the asker, following Wordle's spoiler-free idea.

### Gaps
- No primary Hinge or Tinder swipe data or NGL design sources were fetched in this budget. No Mobbin screens were reviewed.

## Results reveal and data viz (Spotify Wrapped, Polymarket bars)

### Takeaway
Treat the reveal as a short story, not a static chart. Wrapped's sequence of tap-through, full-screen, shareable story cards is the proven format. The reveal should be a ceremony that happens once and builds suspense.

### Cited Findings
- In 2019 Spotify moved Wrapped from a microsite and email to an in-app, story-format sequence that can be shared to Instagram Stories in one tap. — [Wikipedia](https://en.wikipedia.org/wiki/Spotify_Wrapped); [Refinery29](https://www.refinery29.com/en-us/2020/12/10208481/jewel-ham-artist-spotify-wrapped-internship)
- Wrapped turns personal stats into a "celebratory piece of art" using a gamified story format. — [NoGood](https://nogood.io/blog/spotify-wrapped-marketing-strategy/); [UX Playbook](https://uxplaybook.org/articles/spotify-wrapped-ux-design-lessons)

### Inferences
- Suggested reveal sequence: (1) "Your poll closed" with a sealed-card animation; (2) a "Guess the split?" prediction step, which adds suspense and an honest kind of anticipation; (3) the bar animates from 50/50 to the real split over about 1.2s with haptics; (4) the AI summary as a "The room said..." card; (5) 2–3 representative reasons; (6) a share card.
- Keep the variable reward ethical. The result is uncertain by nature, so there is no need to add random rewards or loot mechanics.

### Gaps
- No peer-reviewed data on suspense timing or animation length for reveals was found.

## Gamification without likes; streak and dark-pattern ethics

### Takeaway
Streaks work, but only when they are forgiving. Hiding social counts didn't harm wellbeing or usage. Regulators (EU DSA Art. 25 and the FTC) target deception and manipulation, so credit and streak mechanics must be transparent.

### Cited Findings
- Duolingo's Streak Freeze reportedly cut churn by 21% among at-risk users. Users with 7+ day streaks reportedly retain at 2.4x the rate of others. Making streaks easier to keep increased engagement. These are secondary sources summarizing Duolingo and Lenny's Podcast. — [StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo); [Apptitude teardown](https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/); [Lenny's Podcast summary](https://www.getrecall.ai/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team)
- When Instagram tested hiding like counts, Mosseri said it "didn't actually change nearly as much" about how people felt or used the app, and the feature was "pretty polarizing". — [Platformer](https://www.platformer.news/instagrams-big-likes-anticlimax/)
- An academic study looked at the effects of hiding likes on negative affect and loneliness. — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0191886920307005) (only the abstract title was seen; results not verified)
- DSA Art. 25 bars platforms from designing interfaces that "deceive or manipulate" users or "materially distort or impair" their decisions. A 2022 EU Commission sweep found 97% of popular sites and apps used at least one dark pattern. — [ACM CHI paper](https://dl.acm.org/doi/full/10.1145/3772318.3791479); [Wikipedia](https://en.wikipedia.org/wiki/Dark_pattern)
- The FTC's 2022 staff report "Bringing Dark Patterns to Light" documents manipulative design. — [WBD summary](https://www.womblebonddickinson.com/sites/default/files/2023-06/WBD%20reconnect%20-%20A%20regulatory%20deep%20dive%20into%20'dark%20patterns'.pdf)

### Inferences
- Use mastery signals in place of likes: "You matched the majority 7/10", a "Contrarian" badge, and "your reason was quoted in the AI summary" as a private kudos.
- If Opinion adds streaks, make them weekly rather than daily and include a built-in freeze. Avoid loss-framed copy ("You'll lose..."). Always show the credit balance and the earn/spend rules.
- Do not use fake urgency, confirmshaming, or nagging notifications. These are the main DSA/FTC risks.

### Gaps
- The FTC report says nothing specific about streaks. No regulator guidance on streak mechanics was found.

## Gen Z design preferences and trust

### Takeaway
Gen Z rewards apps that feel "fun and real", fast, and visually polished. They are skeptical of anything that feels AI-generated, which matters directly for how Opinion presents its AI summary.

### Cited Findings
- Gen Z rate authenticity above every other value tested, and prefer brands that are "fun", "authentic" and "good". — [Marketing Dive](https://www.marketingdive.com/news/gen-z-wants-brands-to-be-fun-authentic-and-good-study-says/581191/)
- Smashing Magazine's UX guidance for Gen Z is a practitioner guide covering speed, personalization, and visual appeal. — [Smashing Magazine](https://www.smashingmagazine.com/2024/10/designing-for-gen-z/)
- About 63% of Gen Z see AI as potentially inauthentic, and they dislike designs that feel AI-generated. 53% abandon an experience that takes longer than 3s to load. This comes from a low-authority aggregator. — [Supercharged Studio](https://www.supercharged.studio/blog/gen-z-design-trends)

### Inferences
- Frame the AI summary as a summary of real people's words. Quote real reasons next to it, label it clearly, and let users expand to see the reasons it drew on.
- Polish matters (motion, haptics, a bold type system), but keep the tone casual and human.

### Gaps
- No primary Pew, Snap, Figma, or Adobe Gen Z reports were fetched. Use only cautiously the Gen Z stats above that come from aggregators.

## Onboarding, empty states, notification priming

### Takeaway
Ask for notification permission only after a value moment, using a soft pre-prompt. A natural moment is "Want to know when your poll's result is revealed?". Social apps keep about 40% of users on Day 1 at the median and 50–60% at the top, and the gap is mostly first-session value.

### Cited Findings
- Average push opt-in is about 67.5% overall and about 54–56% on iOS. Pre-permission priming reportedly lifts opt-in 2–3x. Timing alone can move iOS opt-in from 30–40% to 55–70%. — [MobiLoud](https://www.mobiloud.com/blog/push-notification-opt-in-rate/); [Plotline](https://www.plotline.so/blog/how-to-improve-push-notification-opt-in-rates)
- A soft ask with a "remind me later" option is reported to give 30–50% higher acceptance at the system prompt. — [Pushwoosh](https://www.pushwoosh.com/blog/increase-push-notifications-opt-in/)
- Day 1 retention for social apps: about 40% median and 50–60% for strong apps (versus 25% median across all apps). Day 1 reflects onboarding and first-session value. — [UXCam](https://uxcam.com/blog/mobile-app-retention-benchmarks/)

### Inferences
- Suggested first session: age gate → 3 sample polls to vote on right away, with no signup wall if possible (this teaches the mechanic and earns the first credit) → account creation → "Ask your first question" → soft notification ask tied to the reveal.
- The empty feed should never be empty. Seed it with curated campus-relevant polls written by the platform, following Gas's model.

### Gaps
- No Appcues, Mixpanel, or RevenueCat primary benchmarks were retrieved. The notification stats come from vendor blogs, not audited datasets.
