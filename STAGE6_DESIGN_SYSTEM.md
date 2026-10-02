# Opinion — Stage 6: UI/UX Design System

Implemented with NativeWind (Stage 5). Tokens live in `packages/shared/tokens.ts` and feed both `tailwind.config.js` (mobile) and the admin/web theme.

## 1. Design direction

**"Calm verdict."** Opinion is where you go to decide, not to scroll. The feel is quiet, focused and trustworthy — closer to a well-made notes app than a social feed.

| Principle | In practice |
|---|---|
| Two choices, one focus | Every poll is shown as a clear A vs B split; one primary action per screen |
| Human first, AI second | Human quotes in a warm serif; AI text in a sans with a visible "AI" tag and a subtler surface |
| No vanity signals | No hearts, counts of followers, badges for popularity. Numbers appear only as results |
| Privacy is visible | Small lock cues where data stays private ("Only you see this") |
| Time matters | Countdown is always visible on open polls |

## 2. Color

Two option colors carry meaning everywhere: **A = Indigo, B = Amber**. They're chosen to be distinguishable for common color-vision deficiencies, and A/B are always labelled with letters too, never color alone.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #FAFAF7 | #0F1115 | App background (warm off-white / near-black) |
| `surface` | #FFFFFF | #171A21 | Cards |
| `surface-muted` | #F2F1EC | #1F232C | AI summary block, inputs |
| `border` | #E4E2DA | #2A2F3A | Dividers, card borders |
| `text` | #16181D | #F2F2EF | Primary text |
| `text-muted` | #5F6470 | #A3A8B4 | Secondary text |
| `text-faint` | #8C909A | #6F7480 | Captions, timestamps |
| `primary` | #16181D | #F2F2EF | Main buttons (ink style) |
| `on-primary` | #FFFFFF | #0F1115 | Text on primary |
| `option-a` | #4F46E5 | #8B85FF | Option A fills, bars |
| `option-a-soft` | #EEF0FF | #23224A | Option A background |
| `option-b` | #D97706 | #F5B04A | Option B fills, bars |
| `option-b-soft` | #FFF4E0 | #3A2A12 | Option B background |
| `ai` | #0E7C7B | #4FD1C5 | AI tag, AI icon |
| `success` | #15803D | #4ADE80 | Vote submitted, verified |
| `warning` | #B45309 | #FBBF24 | Low audience, closing soon |
| `danger` | #B91C1C | #F87171 | Report, delete, errors |
| `focus` | #2563EB | #60A5FA | Focus ring |

Target WCAG AA (4.5:1 body, 3:1 large text/icons), enforced by a contrast test in CI (`tokens.test.ts`). Not yet verified. Known weak spots to fix when tokens are coded: `option-b` (#D97706) and `text-faint` reach only ~3:1 on light backgrounds, so they're for fills, bars, icons and large text only; small amber text uses a darker #B45309.

## 3. Typography

| Role | Font | Size / line height | Weight |
|---|---|---|---|
| Display (result %, onboarding) | Inter Display | 40/44 | 700 |
| Title (screen titles) | Inter | 24/30 | 700 |
| Question (poll question) | Inter | 20/27 | 600 |
| Body | Inter | 16/24 | 400 |
| Body strong / button | Inter | 16/24 | 600 |
| Label | Inter | 14/20 | 500 |
| Caption | Inter | 12/16 | 500 |
| **Quote** (featured insights, human reasons) | Source Serif 4 | 17/26 | 400 italic |
| Mono (numbers in counters) | Inter, tabular figures | — | — |

- Support Dynamic Type / font scaling up to 200%; layouts reflow, never truncate questions.
- Numbers use tabular figures so countdowns and percentages don't jitter.

## 4. Spacing, radius, elevation

- Spacing scale (4-pt): `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Screen side padding 16 (20 on tablets).
- Radius: `sm 8` (chips, inputs) · `md 12` (buttons) · `lg 16` (cards) · `xl 24` (sheets, option tiles) · `full` (pills, avatars-free tags).
- Elevation: flat by default; cards use a 1px border, not shadow. Only bottom sheets and the floating Create button get a soft shadow (`0 8 24 rgba(0,0,0,0.08)`; dark: no shadow, lighter border).

## 5. Iconography & imagery

- Icons: Lucide (outline, 1.75 stroke, 24px; 20px in dense lists).
- Key icons: Feed `layers`, Create `plus`, My Polls `inbox`, Profile `user-round`, Bell `bell`, AI `sparkles`, Private `lock`, Timer `timer`, Report `flag`, Hide `eye-off`, Expert `graduation-cap`, Community `users`, Taste `palette`.
- No avatars anywhere (no public identity). Poll option images: 4:5 crop, `xl` radius.

## 6. Motion

| Moment | Motion |
|---|---|
| Selecting an option | Tile scales to 1.02, border thickens, light haptic |
| Submit vote | Button → check, success haptic, credit pill counts up |
| Result reveal | Bars grow from 0 over 600ms (ease-out), percentages count up; respects Reduce Motion (instant) |
| Sheets | 250ms spring |
| Countdown < 1h | Turns `warning` color; no pulsing |

## 7. Components

| Component | Variants / states | Notes |
|---|---|---|
| **Button** | primary (ink), secondary (outline), ghost, danger · default/pressed/disabled/loading | Min height 48; full-width on mobile forms |
| **PollCard** (feed) | open · results-ready · removed | Type badge, question, A/B mini tiles, target label, countdown, ⋯ menu |
| **OptionTile** | A/B × unselected/selected/disabled; text only / image+text | Letter badge "A"/"B", 44pt+ touch target |
| **ReasonField** | required (counter 0/200, min 20 hint) · optional · error · rejected | Counter turns `warning` < 20 when required |
| **ConsentRow** | checkbox + "My reason may be featured anonymously" | Required to submit |
| **PredictionPicker** | A/B small chips, skippable | "What will most people pick?" |
| **ResultBar** | split horizontal bar, winner bold, "You" marker | Below-threshold → `NotEnoughState` |
| **AISummary** | majority / minority sections, AI tag, disclaimer, pending skeleton, failed state | `surface-muted`, sans text, sparkles icon |
| **InsightQuote** | A/B side stripe, serif italic, report link | Up to 3, horizontal carousel or stack |
| **CountdownPill** | normal / closing soon / closed | Tabular figures |
| **CreditPill** (header) | balance + progress dots (●●○) | Taps → explains vote-to-ask |
| **AudienceMeter** (create) | ok / low (<20, publish disabled) / loading | "~140 people match" |
| **TypeBadge** | Expert / Community / Taste | Icon + label |
| **Chip** | selectable (categories), counter "3/5" | |
| **EmptyState** | illustration-free: icon + title + body + action | Feed empty, My Polls empty |
| **Banner** | info / warning / danger / privacy (lock) | View-once, offline, removed |
| **BottomSheet** | report reasons, hide creator, confirm vote | |
| **Toast** | success / error | Short, bottom |
| **Skeleton** | card, result, list rows | |
| **TabBar** | 4 tabs + badge on Feed when results are ready | |

## 8. Key screen patterns

**Vote screen (F-02)**
```
┌ ← Expert · Tech · 4h 12m left ─────────┐
│ MacBook Air or ThinkPad X1 for CS?     │  Question
│ ┌──────────────┐ ┌──────────────┐      │
│ │ A  [image]   │ │ B  [image]   │      │  OptionTiles
│ │ MacBook Air  │ │ ThinkPad X1  │      │
│ └──────────────┘ └──────────────┘      │
│ Why? (required)                 34/200 │  ReasonField
│ What will most people pick?  (A) (B)   │  PredictionPicker
│ ☐ My reason may be featured anonymously│  ConsentRow
│ 🔒 Your vote and reason are private    │
│ [        Submit vote — final        ]  │
└────────────────────────────────────────┘
```

**Result screen (F-05)**
```
│ ⓘ You can view this result once          │  Banner
│ A  MacBook Air         62%  ← You         │  ResultBar
│ B  ThinkPad X1         38%                │
│ 37 votes · You picked the majority ✓      │
│ ✦ AI summary                              │  AISummary
│   Majority: battery, resale value…        │
│   Minority: Linux, keyboard…              │
│   AI-generated from voters' reasons.      │
│ Featured insights                         │
│ │ "Battery got me through 3 labs…"  A     │  InsightQuote (serif)
```

## 9. Copy & voice

- Plain, warm, short. Second person. No hype, no emojis in UI text.
- Examples: "Votes are final." · "Results in 4h 12m." · "Not enough people voted to show results." · "You've already seen this result." · "Vote on 2 more polls to post your own."
- AI always named as AI: "AI summary", never "Our take".
- Error messages say what to do: "Please rephrase — this reason can't be accepted."

## 10. Accessibility

- 44×44pt minimum touch targets; option tiles much larger.
- Every interactive element has an accessibility label; option tiles read "Option A, MacBook Air, not selected".
- Results announced to screen readers as text ("MacBook Air 62 percent, your pick, majority").
- Color never the only signal (letters A/B, icons, text).
- Reduce Motion and Dynamic Type respected; dark mode follows the system with an override in Settings.

## 11. Brand basics

- Wordmark: "opinion" in lowercase Inter Display 700, with the "o"s able to read as two choice dots (A indigo, B amber) — used in the app icon as two overlapping circles on ink.
- App icon: ink background (#16181D), two circles (indigo, amber) overlapping; recognisable at 29px.
- Share card (1080×1350): `bg` color, question, split bar in A/B colors, AI summary excerpt, wordmark and "Made with Opinion" footer.

## 12. Deliverables for build

1. `tokens.ts` + Tailwind config (light/dark).
2. Component library in `apps/mobile/components/ui/` with a Storybook (React Native) catalogue.
3. Figma file (optional) mirroring the tokens and components for the key screens: onboarding, feed, vote, result, create, My Polls, profile.
