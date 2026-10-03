import { assert, assertEquals } from 'jsr:@std/assert@1';

import { handle, type Tools } from './protocol.ts';

const calls: string[] = [];
const tools: Tools = {
  ask_real_people: (a) => (calls.push(`ask:${a.question}`), Promise.resolve({ text: 'Posted', data: { poll_id: 'x' } })),
  my_polls: () => Promise.resolve({ text: 'No polls yet.' }),
  my_topics: () => Promise.reject(new Error('db down')),
};

Deno.test('initialize negotiates a supported protocol version', async () => {
  const r = (await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, tools)) as {
    result: { protocolVersion: string; capabilities: { tools: unknown } };
  };
  assertEquals(r.result.protocolVersion, '2025-06-18');
  assert(r.result.capabilities.tools);
});

Deno.test('lists the three tools', async () => {
  const r = (await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, tools)) as { result: { tools: { name: string }[] } };
  assertEquals(r.result.tools.map((t) => t.name).sort(), ['ask_real_people', 'my_polls', 'my_topics']);
});

Deno.test('calls a tool and returns text plus structured content', async () => {
  const r = (await handle(
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ask_real_people', arguments: { question: 'A or B?' } } },
    tools,
  )) as { result: { content: { text: string }[]; structuredContent: unknown; isError: boolean } };
  assertEquals(r.result.content[0].text, 'Posted');
  assertEquals(r.result.isError, false);
  assertEquals(calls, ['ask:A or B?']);
});

Deno.test('tool failures become isError results, not protocol errors', async () => {
  const r = (await handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'my_topics' } }, tools)) as {
    result: { isError: boolean };
  };
  assertEquals(r.result.isError, true);
});

Deno.test('notifications get no response; unknown methods and tools are errors', async () => {
  assertEquals(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' }, tools), null);
  const m = (await handle({ jsonrpc: '2.0', id: 5, method: 'resources/list' }, tools)) as { error: { code: number } };
  assertEquals(m.error.code, -32601);
  const t = (await handle({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'nope' } }, tools)) as { error: { code: number } };
  assertEquals(t.error.code, -32602);
});
