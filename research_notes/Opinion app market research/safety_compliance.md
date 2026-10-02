# Trust & Safety and Legal Compliance for "Opinion" (anonymous-output poll app)

Research date: 2026-10-02. Small research budget (about 10 tool calls); items without a fetched source are listed under Gaps or marked as inference.

## App store rules (Apple 1.2 / 1.2.1 / 4.8 / 5.1.1(v), anonymous apps, Google Play, age ratings and age-assurance laws)

### Takeaway
Apple's 1.2 explicitly bars "random or anonymous chat" apps and requires filtering, reporting, blocking and published contact info. Opinion is safe only if it is positioned as polls with aggregate, anonymized results, not anonymous messaging between people. Developers also have to fill in Apple's new age-rating questionnaire (13+/16+/18+), and the Texas and Utah app-store age laws are now in force.

### Cited Findings
- 1.2 UGC requires (1) a way to filter objectionable material, (2) a way to report content plus timely responses, (3) the ability to block abusive users, and (4) published contact info — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 1.2 says apps used primarily for "Chatroulette-style experiences, random or anonymous chat", "hot-or-not" voting on real people, threats or bullying "do not belong on the App Store and may be removed without notice" — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- 1.2.1(a), on creator content, requires a way to identify content above the age rating and "an age restriction mechanism based on verified or declared age" — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- 4.8: any app that offers third-party or social login (Google, Facebook) must also offer an equivalent option that limits collection to name and email, lets users keep their email private and does no ad tracking without consent. Sign in with Apple meets this. Apps that use only their own account system are exempt — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- 5.1.1(v): if the app supports account creation, users must be able to delete the account in the app. Apps can't require personal info unless it's relevant to core functionality or required by law — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- 2.3.6: answer the age-rating questions honestly; a wrong rating "could trigger an inquiry from government regulators". 2.3.8: metadata must be 4+ appropriate even when the app is rated higher — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- Apple added 13+, 16+ and 18+ ratings (12+ and 17+ removed). The new questionnaire was due by Jan 31, 2026, and Apple blocks submissions and updates until it is done — [MacObserver](https://www.macobserver.com/news/apple-adds-new-app-store-age-ratings-13-16-and-18/); [SoCast](https://www.socastdigital.com/2025/12/15/important-ios-app-age-rating-updates-required-by-january-31-2026/)
- Texas App Store Accountability Act: effective Jan 1, 2026. It was preliminarily enjoined in Dec 2025, then the Fifth Circuit let Texas enforce it (the search summary says late May 2026). Utah's law took effect May 6, 2026. App stores must verify age and get parental consent for minors, then pass age bracket and consent status to developers. Developers must give apps age ratings that match the stores' age brackets, and Utah requires developers to verify the user's age bracket and consent status through the store — [MoFo](https://www.mofo.com/resources/insights/251111-texas-targets-app-stores-with-new-accountability-law); [Baker Data Counsel](https://www.bakerdatacounsel.com/blogs/an-app-developers-guide-to-app-store-age-assurance-laws/); [Privacy & Data Security Insight](https://www.privacyanddatasecurityinsight.com/2025/12/new-app-store-accountability-laws-in-2026-if-your-business-has-an-app-read-on/)

### Inferences
- The main App Review risk is a reviewer reading Opinion as an "anonymous" social app. To lower that risk: never show who voted or who wrote a reason, show reasons only after moderation or only as AI-aggregated summaries, and have no DMs or replies between users. In App Review notes, describe it as "anonymous polling/surveys", not "anonymous messaging".
- If Opinion offers only Sign in with Apple and email, 4.8 is satisfied. Adding Google sign-in means Sign in with Apple must also be offered.
- For an 18+ app: pick the 18+ rating, add a declared-age gate (DOB), and read Apple's Declared Age Range API and Google Play's Age Signals API in Texas and Utah to block minors.

### Gaps
- I didn't fetch Google Play's UGC policy text. From background knowledge (unverified this session), it requires in-app reporting, blocking, moderation, ToS acceptance before posting, and in-app account deletion plus a web deletion link (Play's 2024 Data Safety rule). Check play.google.com/about/developer-content-policy.
- Not checked: the Apple and Google developer APIs for age signals, or details of the Louisiana and California (AB 1043) laws.

## Privacy, online safety and AI law (COPPA, GDPR, DSA, UK OSA, EU AI Act)

### Takeaway
An 18+ app with an age gate largely avoids COPPA. GDPR still applies: DOB counts as personal data, and free-text "anonymous" reasons are pseudonymous, not anonymous. AI Act Art. 50 transparency duties have applied since Aug 2, 2026 and were not delayed. The NGL case shows the FTC will act on deceptive claims about "AI moderation" and on anonymous apps that reach minors.

### Cited Findings
- EU AI Act Art. 50 transparency obligations applied from Aug 2, 2026. The Digital Omnibus delayed only the Annex III high-risk rules (to Dec 2, 2027). There is a narrow grace period to Dec 2, 2026 for machine-readable marking (Art. 50(2)), only for generative systems already on the market before Aug 2, 2026. Fines go up to €15M or 3% of turnover — [Jones Walker](https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html?id=102nbon); [Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/)
- FTC and the California AG v. NGL Labs (July 2024): $5M settlement; NGL is banned from offering the app to users under 18 and from marketing anonymous messaging apps to minors; it is barred from misleading claims, including claims about AI content moderation. The alleged conduct included fake computer-generated messages and a $9.99/week "reveal sender" subscription that didn't reveal anyone — [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2024/07/ftc-order-will-ban-ngl-labs-its-founders-offering-anonymous-messaging-apps-kids-under-18-halt); [Inside Privacy](https://www.insideprivacy.com/uncategorized/ftc-reaches-settlement-with-ngl-labs-over-childrens-privacy-ai/)

### Inferences (background knowledge, not fetched this session; verify)
- COPPA covers under-13s. The amended COPPA Rule was finalized in 2025 with compliance due around April 2026. With a neutral age gate (one that doesn't hint the right answer), an 18+ app is not "directed to children", but actual knowledge of an under-13 user means deleting that data.
- GDPR: DOB and account IDs are personal data. Likely lawful bases are contract (Art. 6(1)(b)) for the service and legitimate interest for safety moderation. Opinions on political, religious, health or sexual topics can reveal special-category data (Art. 9), so a DPIA is advisable because of anonymity, AI processing and possibly sensitive opinions. Collect age range rather than full DOB where possible. Sub-processors such as OpenAI need DPAs and an SCC/DPF basis for transfers.
- DSA: micro and small enterprises are exempt from Arts. 15, 19–28 (most online-platform duties). The baseline still applies: a point of contact and legal representative if the company has no EU establishment, ToS that explain moderation, notice-and-action (Art. 16), and statements of reasons (Art. 17).
- UK Online Safety Act: Opinion is a user-to-user service, so it needs an illegal-content risk assessment and a children's access assessment. Ofcom's guidance expects "highly effective age assurance" if children are likely to access it, and self-declaration does not count as highly effective.
- AI Act Art. 50 for AI summaries: users must be told the summaries are AI-generated. Art. 50(4) covers AI-generated text published "to inform the public on matters of public interest" unless a human edits it. Labelling every summary "AI-generated summary" is cheap and meets the requirement.

### Gaps
- I didn't fetch EUR-Lex, ICO, Ofcom or the FTC COPPA rule text this session, so every point in the inferences above should be checked against primary sources.

## Moderation tooling and costs

### Takeaway
For text of 200 characters or less, run OpenAI's free omni-moderation as the first pass, add a cheap paid classifier or Llama Guard as a second opinion, and keep a human review queue for reports. Perspective API shuts down on Dec 31, 2026, so don't build on it.

### Cited Findings
- OpenAI Moderation endpoint (omni-moderation-latest, text and images) is free for API users and doesn't count toward usage limits — [OpenAI Help](https://help.openai.com/en/articles/4936833-is-the-moderation-endpoint-free-to-use); [OpenAI docs](https://developers.openai.com/api/docs/guides/moderation)
- Perspective API stays active until Dec 31, 2026. Quota requests were handled only until Feb 2026, and Google offers no migration support — [Perspective API](https://www.perspectiveapi.com/); [Tisane Labs](https://medium.com/tisanelabs/goodbye-perspective-api-79da0f237b3f)
- Hive text moderation: $0.50 per 1,000 requests ($1.50 per 1,000 with explanations). The developer plan includes $50 in credits and a default limit of 100 requests per day — [Hive pricing](https://thehive.ai/pricing); [Paxmod comparison](https://www.paxmod.com/blog/content-moderation-api-pricing-comparison)

### Inferences
- At 1M reasons a month, Hive costs about $500 a month and OpenAI costs $0. Llama Guard can be self-hosted, at the cost of GPU or inference-provider compute.
- Images aren't in scope for MVP (text only). If they're added, OpenAI omni-moderation handles images for free.
- Human moderation (background knowledge, unverified): outsourced BPO moderators typically cost about $5–15 per hour offshore and $20–35+ in the US/EU. At launch, a founder-run queue with SLAs (for example, review reports within 24h) is realistic.

### Gaps
- Not checked: Sightengine and AWS Rekognition pricing, Llama Guard 4 licence, and human moderation rate sources.

## Lessons from Yik Yak, Secret, NGL, Gas, Fizz

### Takeaway
The case with a primary source is NGL: an anonymous app that reached teens, made deceptive AI-moderation claims and used dark-pattern monetization, and was banned from serving minors. The other cases come from background knowledge only.

### Cited Findings
- NGL details as above — [FTC](https://www.ftc.gov/news-events/news/press-releases/2024/07/ftc-order-will-ban-ngl-labs-its-founders-offering-anonymous-messaging-apps-kids-under-18-halt)

### Inferences (unverified background)
- Yik Yak (shut down 2017, relaunched 2021): hyperlocal anonymity at schools led to bullying and threats, and the response was geofencing schools out. Secret (shut down 2015): harassment and rumors about named people. Gas (sold to Discord, closed 2023): positive-only, preset compliments as a safety design, but hit by viral trafficking hoaxes. Fizz: college anonymity raised harassment concerns and a later push into high schools drew criticism.
- Lessons for Opinion: no free-form named targeting (block real names and @handles in reasons), no DMs, don't market to minors, make only accurate claims about AI moderation, no fake engagement, and rate-limit poll creation.

### Gaps
- No primary sources were fetched for Yik Yak, Secret, Gas or Fizz.
