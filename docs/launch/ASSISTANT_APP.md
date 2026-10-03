# "Ask real people" in ChatGPT and Claude (MCP)

The `mcp` Edge Function is an MCP server (Streamable HTTP, stateless). Assistants can:
- **`my_topics`**: list the person's topics, so the assistant can pick an audience.
- **`ask_real_people`**: post an anonymous poll to a topic or to the person's close friends. It costs one credit, and assistants can post at most 3 a day per person.
- **`my_polls`**: fetch recent polls and, once a poll closes, its result and AI summary.

Endpoint: `https://<project>.supabase.co/functions/v1/mcp`

## Safety, same as the app
Every assistant post goes through the same checks as the app:
- **Moderation:** the same content check as in the app.
- **Crisis safety net:** the assistant is told to share helplines instead of posting.
- **Named-person check.**
- **Credits.**

App Attest can't run inside an assistant, so the daily limit is tighter (3 posts per person per day). Results stay sealed until a poll closes, exactly as in the app.

## Setup
1. **Turn on Supabase's OAuth server.** In the Supabase dashboard, go to Authentication → OAuth Server and enable it. Set the authorization path to `/oauth/consent`, which is already built in `apps/web/src/app/oauth/consent`. It signs the person in (Apple, Google or email code; existing accounts only), shows what the app can and can't do, and approves or denies. Make sure the Site URL (Authentication → URL Configuration) is the website domain, and allow dynamic client registration, which MCP clients use. People can see and revoke connected apps in the app under Settings → Connected apps.
2. **Set the secret** `PUBLIC_SITE_URL` (e.g. `https://opinion.app`) so friend links in replies point at your domain.
3. **Deploy:** run `supabase functions deploy mcp`. `verify_jwt = false` is already set in `config.toml`, because clients first call without a token to discover OAuth; the function then checks the token itself.
4. **Check it works:** an unauthenticated POST should return `401` with `WWW-Authenticate: Bearer resource_metadata=".../mcp?resource-metadata"`, and that URL should return the protected-resource metadata pointing at `<project>/auth/v1`.

## Publishing
- **ChatGPT:** build the app with the Apps SDK, which uses this MCP server, then submit it in the ChatGPT App Directory. Prepare:
  - the app name "Opinion";
  - the description *"Ask real people. Turn a decision into an anonymous poll; get votes, reasons and a fair summary of both sides."*;
  - privacy policy and support URLs;
  - test prompts such as "I can't decide between two job offers".
- **Claude:** add it as a custom connector (Settings → Connectors) for testing. For wider distribution, submit it to the Claude connectors directory.
- **Directory review** usually checks that destructive or paid actions ask the user first. The `ask_real_people` tool description tells the assistant to ask before posting.

## Ideas for later
- **Display widgets:** render the result as an interactive card inside the conversation (Apps SDK UI component).
- **"Notify me in this chat":** follow-up when the result is ready. This needs the client to support it.
