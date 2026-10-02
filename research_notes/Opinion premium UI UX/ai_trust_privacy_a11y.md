# Trustworthy AI Content, Anonymity/Privacy Cues, and Accessibility for "Opinion"

Note: research was time-boxed (4 searches). Items marked "(primary doc, not re-fetched)" cite well-known canonical guidance pages whose content is stable but was not re-verified in this session.

## AI content presentation: labels, provenance, uncertainty, disclosure and trust

### Takeaway
Bare "AI-generated" labels tend to lower perceived credibility (the "transparency dilemma"), but more detailed, specific disclosure (what AI did, from what inputs) recovers trust. For Opinion, label the summary as AI-written *from voters' reasons*, ground it in visible verbatim quotes, and state counts; EU Art. 50 now makes disclosure effectively mandatory for public-interest text unless human-reviewed.

### Cited Findings
- Across domains, disclosing AI involvement often lowers trust; AI-labelled headlines rated less accurate even when correct ("transparency dilemma") — [AAAI AIES paper](https://ojs.aaai.org/index.php/AIES/article/download/36671/38809/40746); [ResearchGate: Transparency Dilemma](https://www.researchgate.net/publication/389852982_The_Transparency_Dilemma_How_AI_Disclosure_Erodes_Trust)
- Trusting News research: confidence and comfort with the label increased the more information the disclosure included — [Trusting News](https://trustingnews.org/new-research-how-ai-disclosures-in-news-help-and-also-hurt-trust-with-audiences/); see also level-of-detail study [arXiv 2601.09620](https://arxiv.org/pdf/2601.09620)
- AI labels reduced perceived authenticity of user-generated reviews — [MDPI JTAER](https://www.mdpi.com/0718-1876/21/5/154)
- Visible sources alongside AI disclosure studied as a credibility moderator — [JCOM 2026](https://jcom.sissa.it/article/pubid/JCOM_2501_2026_A09/)
- EU AI Act Art. 50 enforceable 2 Aug 2026: providers must machine-mark synthetic text; deployers publishing AI text to inform the public on matters of public interest must disclose it, unless substantively human-reviewed with editorial responsibility; fines up to EUR 15M / 3% turnover — [Orrick](https://www.orrick.com/en/Insights/2026/08/EU-AI-Act-Transparency-Obligations-for-AI-Generated-Content-Article-50); [EC FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act); [Baker Botts](https://www.bakerbotts.com/thought-leadership/publications/2026/september/eu-ai-act-article-50-transparency-obligations-go-live)
- Draft EC Code of Practice on AI labelling published — [Jones Day](https://www.jonesday.com/en/insights/2026/01/european-commission-publishes-draft-code-of-practice-on-ai-labelling-and-transparency)
- Microsoft HAX guideline G1/G2 "Make clear what the system can do / how well", G11 "Make clear why the system did what it did" — [Microsoft HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/) (primary doc, not re-fetched)
- Google PAIR Guidebook chapters "Explainability + Trust" and "Mental Models": calibrate trust, explain data sources — [PAIR Guidebook](https://pair.withgoogle.com/guidebook/) (primary doc, not re-fetched)
- Perplexity / ChatGPT search / Google AI Overviews use inline numbered citations linking claims to sources; Apple Intelligence notification summaries use a distinct glyph and italics (pattern observation; Apple paused news summaries in iOS 18.3 after inaccurate summaries) — gap: not re-sourced this session

### Inferences
- Use a specific label: "Summary written by AI from 1,240 voters' reasons" rather than a generic sparkle badge.
- Tie each summary point to a supporting anonymous quote (citation-chip pattern), and show "based on N reasons" per side; when N is small, show a "few reasons yet" uncertainty state instead of confident prose.
- Offer a "How this works" sheet and a report-summary action (HAX: support efficient correction).
- Opinion is likely a deployer of public-ish opinion text; conservative path is always to disclose.

### Gaps
- No study found specifically on AI summaries of crowd opinions in polls; the trust evidence is from news/reviews.
- Apple/Perplexity UI specifics not re-verified.

## Presenting opinion summaries fairly (minority views)

### Takeaway
Deliberation tools treat "dissent is data": show minority clusters with the same structural weight as majority, and surface consensus and divisions separately.

### Cited Findings
- Pol.is clusters voters into opinion groups and visualizes them; minority opinions are as well-defined as majority ones — [Participedia: Pol.is](https://participedia.net/en/methods/polis); [P2P Foundation](https://wiki.p2pfoundation.net/Pol.is)
- Pol.is highlights consensus while noting disagreement, protecting minority opinions — [Open Rights Group](https://www.openrightsgroup.org/publications/democratic-innovations-polis-and-the-political-process/)
- Talk to the City clusters arguments with LLMs into navigable maps with links back to source quotes — [AI Objectives Institute](https://ai.objectives.institute/blog/introducing-talk-to-the-city-our-collective-deliberation-tool)

### Inferences
- Give majority and minority summaries equal card size/typography; vary only label and percentage.
- Quote selection: include at least one minority quote among the 3, and disclose the selection rule.
- Avoid "winner" framing (trophy colors, confetti) that stigmatizes minority voters.

### Gaps
- Remesh UI not researched.

## Anonymity / privacy UX

### Takeaway
Perceived anonymity strongly increases candor on sensitive topics, but total unaccountability can raise low-effort answers; communicate anonymity concretely and just-in-time at the reason-entry moment.

### Cited Findings
- 74% admitted cheating under anonymity vs 25% under confidentiality — [Ong & Weiss, Impact of Anonymity](https://www.researchgate.net/publication/280778863_The_impact_of_anonymity_on_responses_to_sensitive_questions)
- Complete anonymity sometimes reduced accuracy and increased satisficing — [Lelkes, Krosnick et al. 2012, JESP](https://web.stanford.edu/dept/communication/faculty/krosnick/docs/2012/Anonymity%20JESP%20FINAL%20June%202012.pdf)
- Respondents' belief about anonymity matters as much as actual anonymity — [NCSU thesis](https://repository.lib.ncsu.edu/bitstreams/3bc2ea76-0bec-4db2-af54-588eea2f4951/download)
- Apple App Store privacy "nutrition labels" standardize data disclosure — [Apple](https://developer.apple.com/app-store/app-privacy-details/) (primary doc, not re-fetched)

### Inferences
- Just-in-time line under the reason field: "Your name is never shown. Your reason may be quoted anonymously." plus lock icon; avoid vague "secure" claims.
- Warn users not to include identifying details in reasons (AI/automatic PII scrubbing as backup).
- Light accountability (one vote, 18+ gate) counters satisficing.

### Gaps
- Signal messaging specifics not researched.

## Accessibility for premium feel

### Takeaway
Meet WCAG 2.2 AA and platform features (Dynamic Type, Reduce Motion, VoiceOver/TalkBack); never encode A/B by color alone.

### Cited Findings
- WCAG 2.2 adds 2.5.8 Target Size (Minimum, 24x24 CSS px), 2.4.11 Focus Not Obscured, 3.3.7 Redundant Entry; 1.4.1 Use of Color; 1.4.3 contrast 4.5:1 — [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) (primary doc, not re-fetched)
- Apple HIG: support Dynamic Type, Reduce Motion, 44x44pt hit targets — [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) (primary doc, not re-fetched)

### Inferences
- A/B palette: blue vs orange (color-blind safe) plus letter/icon labels; percentages as text.
- Results chart: expose an accessibility label like "Option A, 62 percent, 1,240 votes; majority". Because results are visible once, ensure screen reader users get the full summary before dismissal and haptics are optional, not sole feedback.
- Replace bar-grow animations with fades under Reduce Motion.

### Gaps
- Android-specific (font scale, TalkBack chart APIs) not verified this session.
