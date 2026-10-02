# Premium Mobile UI Trends (2025–2026) and Expo SDK 57 Implementation, for "Opinion"

Context: Opinion's Stage 6 design system ("Calm verdict") is flat by default, uses 1px borders instead of shadows, Inter + Source Serif 4, A = Indigo / B = Amber, motion with tile scale 1.02, 600ms result bars, 250ms sheet spring, and Reduce Motion support (E:/ZYM Labs/Apps/opinion io/STAGE6_DESIGN_SYSTEM.md). These notes are about what to add on top of that.

## Q1: Apple Liquid Glass (iOS 26) and Material 3 Expressive: what's mandatory, what's optional, who has adopted them

### Takeaway
Liquid Glass is Apple's biggest visual change since iOS 7. It is not mandatory for App Store review, but system chrome (tab bars, nav bars, sheets) gets it for free when you use native components. Material 3 Expressive swaps duration-based easing for spring physics, and Google's research says it tests especially well with 18–24 year-olds, which is Opinion's audience.

### Cited Findings
- Liquid Glass shipped with iOS 26 in September 2025. It is the most significant visual overhaul since iOS 7 dropped skeuomorphism in 2013. — [9to5Mac](https://9to5mac.com/2025/11/06/apple-spotlights-third-party-apps-adopting-liquid-glass-in-ios-26-and-more/)
- Apple runs a developer gallery comparing iOS 18 and iOS 26 versions of adopting apps: Crumbl, OmniFocus 4, CNN, American Airlines, Photoroom, Linearity, LTK, Sky Guide and more. Later updates added AllTrails, Carrot Weather, Fantastical, Trello and Le Monde. — [9to5Mac](https://9to5mac.com/2025/11/06/apple-spotlights-third-party-apps-adopting-liquid-glass-in-ios-26-and-more/); [MacRumors, Apr 2026](https://www.macrumors.com/2026/04/06/apple-liquid-glass-design-gallery-update/)
- Adopting Liquid Glass is not required and does not affect App Store submission. This comes from a Medium practitioner post, a secondary source. — [Medium](https://medium.com/@saianbusekar/liquid-glass-ui-in-ios-26-no-panic-no-rush-no-app-store-risk-3a26f352a946)
- iOS 26 adoption was reported lower than usual early on (around 15% of users some months in), partly blamed on Liquid Glass backlash. These are secondary reports and the numbers vary by source. — [Geeky Gadgets](https://www.geeky-gadgets.com/apple-liquid-glass-adoption-rate/); [Notebookcheck](https://www.notebookcheck.net/iOS-26-reportedly-struggling-for-adoption-amid-Liquid-Glass-UI-backlash.1201110.0.html)
- Material 3 Expressive replaces duration-based easing with a spring motion system. Its parameters are stiffness and damping ratio, where damping ratio 1 means critically damped with no bounce. Tokens come in two kinds: "spatial" springs for movement and "effect" springs for color and opacity, each in default, fast and slow. Springs can be retargeted mid-flight without jarring. — [M3 blog: motion physics](https://m3.material.io/blog/m3-expressive-motion-theming)
- Google's M3E research covered 46 studies with more than 18,000 participants over 3 years. Expressive designs were preferred across ages, most strongly among 18–24 year-olds (up to 87% in some tests). Key elements were spotted up to 4x faster, and the designs were seen as more modern and trustworthy. — [Google Design](https://design.google/library/expressive-material-design-google-research)

### Inferences
- For Opinion, the low-risk, high-value move is to let the system draw the glass: native tabs, native headers and form sheets. Keep content surfaces (poll cards, option tiles) opaque and flat. Glass over a text-heavy reading surface hurts legibility and goes against the "calm" direction.
- On Android, borrow M3E's spring motion and its larger, high-contrast touch targets, not its playful shape-morphing. That keeps the app calm while still matching what 18–24 year-olds prefer.
- Matching spring tokens on both platforms (one "spatial" and one "effect" spring) can be kept in `packages/shared/tokens.ts` alongside the colors.

### Gaps
- I did not fetch Apple's Liquid Glass HIG page itself. Verify the exact guidance there, such as "glass for the navigation layer, not content" and accessibility settings like Reduce Transparency.
- I found no reliable figures for how many top-100 apps have adopted Liquid Glass.
- I did not check whether iOS 27 (expected September 2026) changed Liquid Glass.

## Q2: Motion, micro-interactions, haptics, depth, type, layout, dark mode

### Takeaway
Premium motion in 2026 is built on springs (it can be interrupted and retargeted). Haptics should be sparse and consistent, and should back up something visible. For a decision app, the moments that deserve this effort are selecting an option, locking in the vote and revealing the result.

### Cited Findings
- Apple's haptics guidance: use haptics consistently so people learn what they mean, don't use them for every interaction, and use them to reinforce visual or audio feedback rather than replace it. The system patterns are impact, selection and notification (success, warning, error). — [Apple HIG: Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- Springs can be retargeted at any point, unlike duration-based animations, which look jarring when interrupted. — [M3 blog](https://m3.material.io/blog/m3-expressive-motion-theming)

### Inferences
- Suggested haptic map, using expo-haptics:
  - Selecting an option tile: `selectionAsync()`.
  - Submitting the vote (final): `notificationAsync(Success)`.
  - Result reveal: one light `impactAsync(Light)` when the bars settle.
  - Validation error: `notificationAsync(Error)`.
  - No haptics on scrolling or on taps in the countdown or feed.
- Swap the 600ms ease-out for the result bars to a critically damped spring (no overshoot), so a fast tap-through never looks broken. Keep Reduce Motion as instant.
- A shared-element style move from the feed card to the vote screen (the A/B tiles grow into place) is the one "signature" transition worth investing in.
- Variable fonts: the system already uses tabular figures. Inter is available as a variable font, but whether React Native supports variable axes reliably was not verified, so ship static weights.
- Bento layouts fit the profile or stats screen at most. The feed should stay a single focused column, in line with "one focus".
- Dark mode quality: the design system already uses a near-black #0F1115 rather than pure black and lifts dark surfaces with lighter borders instead of shadows. That matches common practice, but I did not fetch a source for it.

### Gaps
- I did not fetch dedicated sources on variable fonts in React Native, bento trends, or dark-mode craft. The points above are inferences.
- I did not fetch Apple's Core Haptics custom-pattern guidance (AHAP). expo-haptics only exposes the system patterns.

## Q3: Polish benchmarks (Things, Linear, Arc Search, Headspace/Calm, Airbnb, Revolut, Apple Invites)

### Takeaway
I did not research this question within the tool budget, so there are no sourced findings for these apps.

### Cited Findings
- None. The only adjacent sourced item is Apple's Liquid Glass gallery listing OmniFocus 4, Fantastical and Trello as adopters. — [MacRumors](https://www.macrumors.com/2026/04/06/apple-liquid-glass-design-gallery-update/)

### Inferences
- (Unsourced, from general knowledge, to verify on Mobbin.) Craft patterns often credited to these apps:
  - Things: restrained springs and a single accent color.
  - Linear: fast, keyboard-like responsiveness.
  - Headspace and Calm: soft pacing and generous whitespace.
  - Airbnb: shared-element transitions from card to detail.
  - Revolut: bold numerals and count-up stats.
  - Apple Invites: rich image backgrounds with glass chrome.

### Gaps
- Needs a dedicated pass (Mobbin, case studies) for app-by-app evidence.

## Q4: Implementation in Expo SDK 57 (expo-glass-effect, native tabs, Reanimated 4, Skia, haptics, blur, fonts, performance)

### Takeaway
SDK 57 (released June 30, 2026) is a non-breaking update to React Native 0.86 that bundles Reanimated 4.5, Worklets 0.10 and Gesture Handler 2.32. Use `expo-glass-effect` for any custom glass, with a fallback, and use native tabs for system Liquid Glass. Upgrade to at least expo@57.0.17 because of a memory regression.

### Cited Findings
- SDK 57 ships React Native 0.86 with React 19.2 unchanged, and is described as non-breaking. It bundles Reanimated 4.5, Worklets 0.10 and Gesture Handler 2.32. expo@57.0.17 (August 27) moves to React Native 0.86.3 and fixes a Hermes V1 memory regression from SDK 56 that hit apps importing worklets or Reanimated. — [Expo changelog SDK 57](https://expo.dev/changelog/sdk-57)
- `expo-glass-effect` API:
  - `GlassView` accepts `glassEffectStyle` (`'clear' | 'regular' | 'none'`, or a config with `animate`/`animationDuration`), `tintColor`, `isInteractive` and `colorScheme`.
  - `GlassContainer` has a `spacing` prop that controls when glass shapes merge.
  - `isLiquidGlassAvailable()` checks the build and `isGlassEffectAPIAvailable()` checks at runtime.
  - It needs iOS 26+ and falls back to a plain `View` elsewhere.
  - Setting opacity to 0 on a GlassView or any of its parents stops the glass from rendering.
  — [Expo docs: GlassEffect](https://docs.expo.dev/versions/latest/sdk/glass-effect/)
- Expo Router native tabs:
  - API: `NativeTabs`, `NativeTabs.Trigger`, `Icon`, `Label` and `Badge`.
  - The docs say the stable import `expo-router/native-tabs` is SDK 58+, so on SDK 57 use `expo-router/unstable-native-tabs`.
  - On iOS 26 the system renders Liquid Glass, and the `backgroundColor`/`shadowColor` props only apply on iOS 18 and earlier.
  - Features: `minimizeBehavior="onScrollDown"`, `role="search"` and a bottom accessory.
  - Android allows at most 5 tabs.
  - Limitations: no nested native tabs, no dynamic tabs, limited FlatList scroll-to-top, and the tab bar height can't be measured.
  — [Expo docs: Native tabs](https://docs.expo.dev/router/advanced/native-tabs/)
- Reanimated 4 CSS animations (`animationName` keyframes, multiple animations per element) work on iOS, Android and web. — [Reanimated docs](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/animation-name/)

### Inferences
- Opinion's 4 tabs fit the Android limit. Use native tabs with a Feed badge. Because the tab bar height can't be measured, add bottom padding through safe-area or content insets, not a fixed number.
- Use Reanimated CSS transitions for simple state changes (tile border and scale on select, countdown color change). Use shared values with `withSpring` for the result bars and the count-up.
- Skia is only worth adding for one hero visual, such as a result split ring. The current bars render fine with plain Views, so skip it to protect bundle size and startup time.
- Use `expo-blur` only as the non-iOS-26 fallback behind sheets or headers. Don't stack blur over long lists on Android, because it costs frame rate.
- Load fonts with the expo-font config plugin (embedded at build time) to avoid a flash of unstyled text.
- Performance budget (a heuristic, not sourced): keep 60fps on mid-range Android, keep animations on the UI thread (worklets) and keep glass to chrome only.

### Gaps
- I did not fetch the Reanimated 4 transitions page or the New Architecture requirement (Reanimated 4 is generally understood to require the New Architecture; verify).
- I did not fetch the React Native Skia, expo-blur or expo-haptics docs.
- I found no sourced performance budgets.
- The SDK 58 versus 57 stable native-tabs import path comes from the docs as currently published. Double-check it against the SDK 57 versioned docs.
