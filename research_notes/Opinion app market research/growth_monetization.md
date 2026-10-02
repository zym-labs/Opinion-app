# Opinion: Go-to-Market, Growth & Monetization

## Cold-start / liquidity tactics for two-sided Q&A/poll networks

### Takeaway
The pattern that keeps working: launch one dense "atomic network" at a time (a single campus or school), win over the "hard side" first, and seed content by hand. For Opinion the hard side is answerers. Gas and Fizz both grew one school at a time with no paid marketing.

### Cited Findings
- Chen's "atomic network" is the smallest group of users that makes a product usable. It is 2–3 people for Zoom and 5–10 for Slack. Tinder needed about 500 people on a single college campus — [Food On Demand on Chen](https://foodondemand.com/01062022/andrew-chen-examines-the-cold-start-problem-for-platforms-like-uber-snackpass/)
- The "hard side" is a minority of users who create a disproportionate share of the value and are harder to acquire and retain. Winning them over is paramount to standing up an atomic network — [Antoine Buteau, Lessons from Andrew Chen](https://www.antoinebuteau.com/lessons-from-andrew-chen/)
- Reddit's founders seeded content under fake accounts until real users took over — [Lessons from Andrew Chen](https://www.antoinebuteau.com/lessons-from-andrew-chen/)
- Gas launched school by school:
  - It created a private Instagram account per school (e.g., @gas.georgiahigh) and followed students whose bios named that school.
  - It held back follow-requests, then accepted them all at 3pm on launch day. The profile read "See who likes you," with a download link.
  - It repeated this every few weeks for one new school at a time.
  - Reported results: 30,000+ new users per hour at peak, about $10M revenue, acquired by Discord, $0 marketing spend. These figures come from secondary or LinkedIn sources and are unaudited — [Synergy Labs](https://www.synergylabs.co/blog/how-nikita-bier-built-two-viral-apps-without-spending-a-dollar-on-marketing); [Wikipedia: Gas](https://en.wikipedia.org/wiki/Gas_(app))
- Fizz launched at Stanford on July 29, 2021 and reached 700+ users (about 10% of undergrads) in a week. Adoption later reached 95% of Stanford's roughly 7,600 undergrads and 70% at Rice. It raised a $4.5M seed to expand campus by campus — [TechCrunch](https://techcrunch.com/2022/10/04/fizz-app-college-stanford-social/); [Stanford Daily](https://stanforddaily.com/2022/10/05/stanford-startup-fizz-secures-4-5-million-in-seed-funding-targets-nationwide-expansion/)
- Fizz's on-campus promotion included free donuts in exchange for downloads. It did no paid or influencer marketing early on, and its growth was credited to a hyper-local, moderated community — [Stanford Ethics in Society case study](https://ethicsinsociety.stanford.edu/sites/ethicsinsociety/files/media/file/case_study_fizz1.pdf); [Business of Creators](https://bizofcreators.com/inside-fizz-how-teddy-solomon-built-gen-zs-favorite-campus-social-app/)
- Bryan Kim (a16z) recommends that 80–90% of early acquisition be organic, with paid at most 10–20%: "no amount of marketing dollars can fix a product" — [a16z](https://a16z.com/do-you-have-lightning-in-a-bottle-how-to-benchmark-your-social-app/)

### Inferences
- Opinion's 3–24h poll window fits an atomic-network model well. A poll needs maybe 10–30 voters with reasons to feel useful, which is achievable inside one campus community or one niche expert category.
- An "answer-to-ask" mechanic (vote on N polls to earn a post) turns every asker into an answerer. That addresses the hard-side supply problem without likes or followers. Gas/tbh-style school launches plus founder-seeded polls per category look like the strongest playbook.
- Without likes or followers, answerers need other rewards:
  - Feedback loops: "your reason was cited in the AI summary," or "the asker chose your option."
  - Streaks.
  - Credits that unlock asks or boosts.

### Gaps
- I found no citable primary sources in this pass on Quora's or Stack Overflow's seeding, Yik Yak's campus launch, or how well answer-to-ask credit systems perform. Those came from background knowledge only, so they aren't cited here.

## Retention benchmarks and CAC for Gen Z social apps

### Takeaway
a16z puts a "good" social app at D1 60% / D7 40% / D30 25%, and "great" at 70/50/30. The category median is far lower: about 26% D1 and 4–5% D30. Paid installs reaching Gen Z cost roughly $3–4.

### Cited Findings
- a16z (Bryan Kim, March 2023):
  - Good: D1 60%, D7 40%, D30 25%. Great: D1 70%, D7 50%, D30 30%.
  - DAU/MAU: good 40%, great 50%+.
  - L5+ weekly engagement: good 40%, great 50%+.
  - Monthly growth: good 35%, great 50%.
  - [a16z](https://a16z.com/do-you-have-lightning-in-a-bottle-how-to-benchmark-your-social-app/)
- Industry medians for social apps are about D1 25–29%, D7 9–10% and D30 about 5%. Strong performers reach D30 15–20%. These come from aggregator blogs and are lower confidence — [UXCam](https://uxcam.com/blog/mobile-app-retention-benchmarks/); [Plotline](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry)
- iOS retains 2–3 percentage points more users than Android (27% vs 24% D1) — [UXCam](https://uxcam.com/blog/mobile-app-retention-benchmarks/)
- Average cost per install (CPI): TikTok about $2.88, Facebook about $3.75, Instagram $3.50–4.00. CAC per *paying* user is much higher; for example, a $2 CPI with 4% conversion gives a $50 CAC — [Business of Apps](https://www.businessofapps.com/marketplace/user-acquisition/research/user-acquisition-costs/); [Survicate](https://survicate.com/blog/app-user-acquisition-cost/)

### Inferences
- If paid CAC is $3–4 per install and the app has no ads or social graph, paid growth cannot pay back early on. Organic campus seeding is close to mandatory.

### Gaps
- I found no primary Sensor Tower or Adjust Gen Z-specific CAC report. Aggregator CPI numbers vary by source.

## Monetization options for a private, no-social-graph poll app

### Takeaway
Opinion has no followers or feed, so ad inventory is small and ads are a weak fit. The strongest fits are:
- Consumer freemium: extra polls, longer windows, expert-category boosts, deeper AI summaries.
- Gas-style paid "insight" features.
- B2B: selling access to opt-in respondents, priced against panels. Pollfish charges about $1–3 per complete; Prolific's cost per participant comes out higher once its platform fee is added.

### Cited Findings
- Pollfish charges per response, starting around $0.95 per complete. Typical cost is $1–3, and it can exceed $2 with targeting or longer surveys — [SurveyMars](https://surveymars.com/knowledge/pollfish-pricing-analysis-is-it-cost-effective-for-market-research/); [FreeSurveyMakers](https://freesurveymakers.com/pollfish/)
- Prolific pricing:
  - Platform fee: 42.8% for corporate customers, 33.3% for academic.
  - Participant pay: minimum £6 / $8 per hour, recommended £9 / $12 per hour.
  - Example: a 30-minute study comes to about $8.57 per participant for a corporate customer.
  - Sources: [Koji](https://www.koji.so/blog/prolific-pricing-2026); [Usercall](https://www.usercall.co/post/prolific-pricing)
- Gas made about $10M in revenue in a few months through paid reveal features, with no ads — [Synergy Labs](https://www.synergylabs.co/blog/how-nikita-bier-built-two-viral-apps-without-spending-a-dollar-on-marketing)

### Inferences
- Two-option polls with written reasons and AI summaries are close to a quick-turn concept test. B2B "pulse polls" could be priced around $1–3 per targeted response, in line with Pollfish. That requires explicit consent and possibly paying respondents with credits. Doing this risks the trust the app's privacy positioning depends on.
- Ads clash with the private, no-feed positioning.

### Gaps
- I didn't verify SurveyMonkey Audience's pricing, or conversion and ARPU benchmarks for poll-app subscriptions.

## Target segments and market size

### Takeaway
Gen Z already crowdsources decisions: they ask friends, check Reddit, and are swayed by social media. Young adults commonly seek career and relationship advice. The adjacent B2B market is large: about $150B+ for insights overall and $56B for market research alone. Estimates for the survey software market vary widely, from about $3B to $16B.

### Cited Findings
- 85% of Gen Z say social media influences their purchases (ICSC) — [Retail Dive](https://www.retaildive.com/news/generation-z-social-media-influence-shopping-behavior-purchases-tiktok-instagram/652576/)
- 45% of Gen Z look to friends and family for purchase inspiration. They also ask friends, use Reddit and read reviews before buying — [Kard](https://www.getkard.com/blog/how-gen-z-makes-a-purchase-decision-in-2026); [eMarketer](https://www.emarketer.com/content/gen-zers-comb-through-product-reviews-before-buying)
- 55% of Gen Z bought something while browsing social media in the past six months — [Retail Dive](https://www.retaildive.com/news/gen-z-shoppers-ecommerce-product-discovery-social-media-walmart/722737/)
- Among adults aged 18–24 (Pew, 2024):
  - At least sometimes turn to their parents for career or job advice: 77%. For finances: 79%.
  - Romantic relationships: 66% (among those not married or living with a partner).
  - [Pew](https://www.pewresearch.org/social-trends/2024/01/25/young-adults-relationship-with-their-parents/)
- Insights industry size (ESOMAR / Research World):
  - Over $150B in 2024; expected to pass $160B in 2025.
  - Breakdown: market research $56B, research software $62B, reporting $35B.
  - [Research World](https://researchworld.com/articles/inside-the-153bn-insights-industry)
- Survey software market estimates conflict, from about $3.3–4.7B to $15.7B in 2025, depending on how the market is defined — [Mordor](https://www.mordorintelligence.com/industry-reports/survey-software-market); [Precedence](https://www.precedenceresearch.com/online-survey-software-market); [Knowledge Sourcing](https://www.knowledge-sourcing.com/report/global-online-survey-software-market)

### Inferences
- Lead consumer segments:
  - College students, who give the atomic network and cover purchase, career and relationship questions.
  - Pre-purchase shoppers.
  - Early-career professionals asking expert categories.
- B2B is a second-phase revenue line, not the launch wedge.

### Gaps
- I found no reliable sizing for consumer "advice/Q&A app" demand specifically, and no Gen Z data on willingness to pay for advice.
