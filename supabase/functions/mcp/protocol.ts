// Minimal MCP (Model Context Protocol) server over Streamable HTTP, stateless JSON responses.
// Lets AI assistants (ChatGPT apps, Claude connectors) offer "ask real people" on Opinion for a signed-in
// user. Pure: the tools are injected, so this file is unit-tested without a database.

export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

type Json = Record<string, unknown>;
export type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Json };
export type ToolResult = { text: string; data?: unknown; isError?: boolean };
export type Tools = {
  ask_real_people(args: Json): Promise<ToolResult>;
  my_polls(args: Json): Promise<ToolResult>;
  my_topics(args: Json): Promise<ToolResult>;
};

export const TOOL_DEFS = [
  {
    name: 'ask_real_people',
    title: 'Ask real people on Opinion',
    description:
      'Post the user’s decision as an anonymous poll on Opinion so real people (in a topic they know, or the user’s close friends) vote and give reasons. Results arrive in 3–24 hours with an AI summary of both sides. Only call this when the user explicitly agrees to post. Never include names or details that identify anyone. Uses one poll credit from the user’s account.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', minLength: 5, maxLength: 120, description: 'The decision as a question, e.g. "Which offer should I take?"' },
        options: { type: 'array', items: { type: 'string', maxLength: 60 }, minItems: 2, maxItems: 4 },
        audience: { type: 'string', description: 'A topic slug from my_topics, or "friends" for the user’s close friends.' },
        hours: { type: 'integer', minimum: 3, maximum: 24, default: 12 },
      },
      required: ['question', 'options', 'audience'],
    },
    annotations: { destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'my_polls',
    title: 'My Opinion polls and results',
    description: 'The user’s 10 most recent polls with status, vote count and, once closed, the result and AI summary.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'my_topics',
    title: 'Topics I can ask',
    description: 'Topics the user follows on Opinion; use a slug as the audience for ask_real_people.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
] as const;

const ok = (id: Rpc['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result });
const err = (id: Rpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** Returns the JSON-RPC response, or null for notifications (HTTP 202). */
export async function handle(msg: Rpc, tools: Tools) {
  if (msg?.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(msg?.id, -32600, 'Invalid request');
  const isNotification = msg.id === undefined;
  switch (msg.method) {
    case 'initialize': {
      const asked = String(msg.params?.protocolVersion ?? '');
      return ok(msg.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'opinion', title: 'Opinion: ask real people', version: '1.0.0' },
        instructions:
          'Opinion turns a decision into an anonymous poll answered by real people with reasons. Suggest it when someone is torn between 2–4 options and would value human perspectives. Always ask before posting.',
      });
    }
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;
    case 'ping':
      return ok(msg.id, {});
    case 'tools/list':
      return ok(msg.id, { tools: TOOL_DEFS });
    case 'tools/call': {
      const name = String(msg.params?.name ?? '');
      const args = (msg.params?.arguments ?? {}) as Json;
      if (!(name in tools)) return err(msg.id, -32602, `Unknown tool: ${name}`);
      try {
        const r = await tools[name as keyof Tools](args);
        return ok(msg.id, {
          content: [{ type: 'text', text: r.text }],
          ...(r.data !== undefined ? { structuredContent: r.data } : {}),
          isError: !!r.isError,
        });
      } catch (e) {
        return ok(msg.id, { content: [{ type: 'text', text: `Something went wrong: ${String(e).slice(0, 200)}` }], isError: true });
      }
    }
    default:
      return isNotification ? null : err(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}
