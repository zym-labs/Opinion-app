// Opinion MCP server: "ask real people" from inside ChatGPT, Claude and other MCP clients.
// Auth: an OAuth 2.1 access token issued by Supabase Auth (OAuth server enabled in the dashboard), sent as
// a Bearer token. Unauthenticated requests get a 401 pointing at the protected-resource metadata.
// Posting goes through the same moderation as the app (crisis net, named-person check), spends a credit,
// and is limited to 3 assistant posts a day. App Attest can't run here, hence the tighter limit.
import { targetsPrivatePerson } from '../_shared/ai.ts';
import { admin, cors, getUserId } from '../_shared/http.ts';
import { isCrisis, moderateText } from '../_shared/moderation.ts';
import { handle, type Rpc, type Tools } from './protocol.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const RESOURCE = `${SUPABASE_URL}/functions/v1/mcp`;
const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://opinion.example';

const MESSAGES: Record<string, string> = {
  INSUFFICIENT_CREDITS: 'The user needs more poll credits: they earn them by voting on others’ polls in the Opinion app (3 votes = 1 poll).',
  AUDIENCE_TOO_SMALL: 'Fewer than 20 people follow that topic yet. Try a broader topic or "friends".',
  RATE_LIMITED: 'Assistants can post at most 3 polls a day per person. Try again tomorrow, or post from the app.',
  ONBOARDING_INCOMPLETE: 'The user needs to finish setting up Opinion in the app first.',
  PLUS_REQUIRED: 'Polls over 24 hours need Opinion+.',
};

function toolsFor(userId: string): Tools {
  return {
    async my_topics() {
      const { data, error } = await admin.rpc('mcp_topics', { p_user: userId });
      if (error) return { text: 'Could not load topics.', isError: true };
      const topics = (data ?? []) as { slug: string; name: string }[];
      return {
        text: topics.length
          ? `Topics: ${topics.map((t) => `${t.name} (${t.slug})`).join(', ')}. Or use "friends" for close friends.`
          : 'No topics yet; use "friends", or the user can add topics in the app.',
        data: { topics },
      };
    },

    async my_polls() {
      const { data, error } = await admin.rpc('mcp_my_polls', { p_user: userId });
      if (error) return { text: 'Could not load polls.', isError: true };
      const polls = (data ?? []) as { question: string; status: string; votes: number; result?: { options?: { label: string | null; pct: number | null }[]; summary?: { majority?: string | null } | null } }[];
      if (!polls.length) return { text: 'No polls yet.', data: { polls } };
      const lines = polls.map((p) => {
        if (p.result?.options) {
          const split = p.result.options.map((o) => `${o.label ?? 'image'} ${Number(o.pct ?? 0).toFixed(0)}%`).join(' / ');
          return `• "${p.question}": ${split}. ${p.result.summary?.majority ? `Most said: ${p.result.summary.majority}` : ''}`;
        }
        return `• "${p.question}": ${p.status}, ${p.votes} votes so far (results stay sealed until it closes).`;
      });
      return { text: lines.join('\n'), data: { polls } };
    },

    async ask_real_people(args) {
      const question = String(args.question ?? '').trim();
      const options = (Array.isArray(args.options) ? args.options : []).map((o) => String(o ?? '').trim()).filter(Boolean);
      const audience = String(args.audience ?? '').trim();
      const hours = Math.min(24, Math.max(3, Math.round(Number(args.hours ?? 12)) || 12));
      if (question.length < 5 || question.length > 120 || options.length < 2 || options.length > 4 || options.some((o) => o.length > 60)) {
        return { text: 'Questions need 5–120 characters and 2–4 options of up to 60 characters.', isError: true };
      }
      const { error: rl } = await admin.rpc('hit_rate_limit', { p_user: userId, p_action: 'mcp_publish', p_max: 3, p_window: '1 day' });
      if (rl) return { text: MESSAGES.RATE_LIMITED, isError: true };

      const mod = await moderateText([question, ...options]);
      if (isCrisis([question, ...options], mod)) {
        await admin.rpc('record_crisis', { p_user: userId });
        return {
          text: 'This sounds like something to talk through with a person, not a poll. Please share crisis support (e.g. 988 in the US, Samaritans 116 123 in the UK, findahelpline.com elsewhere) and do not post it.',
          isError: true,
        };
      }
      if (mod.state === 'rejected') return { text: 'Opinion can’t post this; it breaks the community guidelines.', isError: true };
      if (await targetsPrivatePerson([question, ...options])) {
        return { text: 'Questions can’t be about a specific person who could be recognised. Rephrase it around the situation.', isError: true };
      }

      const friends = audience === 'friends';
      // Drafts need a topic; friends-only polls use the person's first topic (nobody outside the circle sees them).
      let categories: number[] = [];
      if (friends) {
        const { data: own } = await admin.from('user_categories').select('category_id').eq('user_id', userId).limit(1);
        if (!own?.length) return { text: 'The user needs at least one topic in the app first.', isError: true };
        categories = [own[0].category_id];
      } else {
        const { data: cat } = await admin.from('categories').select('id').eq('slug', audience).eq('archived', false).maybeSingle();
        if (!cat) return { text: `Unknown audience "${audience}". Call my_topics for valid topics, or use "friends".`, isError: true };
        categories = [cat.id];
      }
      const { data: pollId, error } = await admin.rpc('create_poll_draft', {
        p_user: userId, p_type: 'expert', p_is_taste: false, p_question: question, p_labels: options,
        p_categories: categories, p_age_min: null, p_age_max: null, p_community: null,
        p_duration: hours, p_moderation: mod.state,
      });
      if (error) return { text: MESSAGES[error.message] ?? 'Could not create the poll.', isError: true };
      const { error: pubErr } = await admin.rpc('publish_poll_internal', { p_user: userId, p_poll: pollId, p_friends_only: friends });
      if (pubErr) {
        await admin.from('polls').delete().eq('id', pollId).eq('status', 'draft');
        return { text: MESSAGES[pubErr.message] ?? 'Could not publish the poll.', isError: true };
      }
      let share = '';
      if (friends) {
        const { data: p } = await admin.from('polls').select('invite_code').eq('id', pollId).single();
        if (p?.invite_code) share = ` Share this link with friends: ${SITE}/p/${p.invite_code}`;
      }
      return {
        text: `Posted to ${friends ? 'their close friends' : `people who know ${audience}`}. Votes are anonymous; the result and an AI summary of both sides arrive in about ${hours} hours (ask me to check with my_polls).${share}`,
        data: { poll_id: pollId, closes_in_hours: hours },
      };
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...cors, 'Access-Control-Allow-Headers': `${cors['Access-Control-Allow-Headers']}, mcp-protocol-version, mcp-session-id` } });

  // RFC 9728 protected-resource metadata, so clients can find the authorization server.
  if (req.method === 'GET' && new URL(req.url).searchParams.has('resource-metadata')) {
    return Response.json({ resource: RESOURCE, authorization_servers: [`${SUPABASE_URL}/auth/v1`], scopes_supported: ['openid', 'email'] });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });

  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': `Bearer resource_metadata="${RESOURCE}?resource-metadata"` },
    });
  }

  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }
  const tools = toolsFor(userId);
  const batch = Array.isArray(body) ? body : [body];
  const out = (await Promise.all(batch.map((m) => handle(m, tools)))).filter((r) => r !== null);
  if (!out.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: { 'Content-Type': 'application/json' } });
});
