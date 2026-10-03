# Native features not yet built: App Clip and Siri (App Intents)

Both need native iOS targets and Swift code that can only be compiled and tested on a Mac or with an EAS build. That's why they're planned here rather than shipped.

## App Clip: vote from a friend's link without installing
**Why:** a friend link (`/p/<code>`) could open a lightweight App Clip, so people vote in seconds. Pre-install experiences can lift conversion about 35–50%. Android Instant Apps are being retired, so Android keeps the web page plus install.

**Scope of the Clip (under the 15 MB uncompressed limit for iOS 17+ link launches):**
1. Show the question and options (`get_invite_preview`).
2. Sign in with Apple, plus an 18+ birth-year check (the same rules as the app).
3. Pick an option and give an optional reason, then submit through the `votes` function. App Attest works in Clips.
4. "Get the full app to see the result": the vote carries over, because it's tied to the same account.

**Build plan:**
- Add a Clip target with a config plugin (e.g. the community `react-native-app-clip` plugin) or a separate Swift target. Share the Supabase client logic.
- Add an `appclips` entry to the website's `apple-app-site-association`, and set the App Clip experience URL to `https://<domain>/p/`.
- Test on a device with a development build; check the size budget with `xcrun`.

**Risks:** binary size with React Native (a Swift-only Clip may be needed); sign-in friction inside Clips.

## Siri, Shortcuts and Spotlight (App Intents)
**Why:** since WWDC26, App Intents is the only way Siri, Spotlight and Apple Intelligence reach apps.

**Intents:**
| Intent | Phrase | Does |
|---|---|---|
| `AskOpinion` | "Ask Opinion …" | Opens Create with the question filled in |
| `AnswerDailyQuestion` | "Today's question on Opinion" | Opens the daily question |
| `MyPollStatus` | "How's my poll doing?" | Speaks "14 votes, closes in 3 hours" (no results before close) |

**Build plan:**
- Use `expo-app-intents` (alpha; its documentation targets Expo SDK 58) after upgrading from SDK 57 to 58.
- Declare the intents in Swift in the `app-intents/` folder; it routes calls to JS handlers that use the existing RPCs.
- Write tests with the App Intents Testing framework.

**Order:** upgrade to SDK 58 first, then App Intents, then the App Clip.
