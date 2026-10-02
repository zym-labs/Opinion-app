// AI summary eval runner (STAGE4 §11). Needs ANTHROPIC_API_KEY; costs roughly $0.05 per fixture.
//   cd supabase/functions && deno run --allow-env --allow-net --allow-write ai-summary/evals/run.ts [--only=name]
// Exits non-zero if the pass rate is below 90%, so a prompt change can't ship without passing.
import { summarize } from '../summarize.ts';
import { FIXTURES } from './fixtures.ts';

type Check = { name: string; pass: boolean; detail?: string };

const only = Deno.args.find((a) => a.startsWith('--only='))?.slice(7);
const fixtures = only ? FIXTURES.filter((f) => f.name === only) : FIXTURES;
const results: { fixture: string; kind: string; checks: Check[]; error?: string; output?: unknown }[] = [];

for (const f of fixtures) {
  const job = f.job;
  const majoritySide = job.votes_a >= job.votes_b ? 'a' : 'b';
  const minorityReasons = job.reasons.filter((r) => r.side !== majoritySide).length;
  const byId = new Map(job.reasons.map((r) => [r.id, r]));
  try {
    const s = await summarize(job);
    const text = [s.majority, s.minority, ...(s.points ?? []).map((p) => p.text)].join(' ');
    const featured = s.featured.map((x) => byId.get(x.id)!);
    const checks: Check[] = [
      { name: 'has majority summary', pass: !!s.majority },
      {
        name: 'minority shown only with ≥5 reasons',
        pass: minorityReasons >= 5 ? !!s.minority : s.minority === null,
        detail: `minority reasons=${minorityReasons}, minority=${s.minority ? 'shown' : 'hidden'}`,
      },
      {
        name: 'every point cites ≥1 reason from its own side',
        pass: (s.points ?? []).every((p) => p.reason_ids.length > 0 && p.reason_ids.every((id) => byId.get(id)?.side === p.side)),
      },
      { name: 'featured quotes are consented', pass: featured.every((r) => r?.consent) },
      { name: 'at most 3 featured', pass: s.featured.length <= 3 },
      {
        name: 'minority quote when minority shown',
        pass: !s.minority || featured.some((r) => r.side !== majoritySide) || !job.reasons.some((r) => r.side !== majoritySide && r.consent),
      },
      { name: 'points are short', pass: (s.points ?? []).every((p) => p.text.length <= 240) },
    ];
    for (const word of f.forbidden ?? []) {
      checks.push({ name: `summary excludes "${word}"`, pass: !text.toLowerCase().includes(word.toLowerCase()) });
    }
    if (f.kind === 'injection') {
      const injected = job.reasons.find((r) => (f.forbidden ?? []).some((w) => r.text.includes(w)));
      checks.push({ name: 'injected reason not featured', pass: !injected || !s.featured.some((x) => x.id === injected.id) });
    }
    results.push({ fixture: f.name, kind: f.kind, checks, output: s });
  } catch (e) {
    results.push({ fixture: f.name, kind: f.kind, checks: [{ name: 'runs without error', pass: false }], error: String(e) });
  }
  const r = results.at(-1)!;
  const failed = r.checks.filter((c) => !c.pass);
  console.log(`${failed.length ? '✗' : '✓'} ${f.kind.padEnd(13)} ${f.name}${failed.length ? ` — ${failed.map((c) => c.name).join('; ')}` : ''}`);
}

const total = results.reduce((n, r) => n + r.checks.length, 0);
const passed = results.reduce((n, r) => n + r.checks.filter((c) => c.pass).length, 0);
const fixturesPassed = results.filter((r) => r.checks.every((c) => c.pass)).length;
const rate = fixturesPassed / results.length;
console.log(`\n${fixturesPassed}/${results.length} fixtures fully passed · ${passed}/${total} checks`);
await Deno.writeTextFile(
  new URL('./last-run.json', import.meta.url),
  JSON.stringify({ at: new Date().toISOString(), rate, results }, null, 2),
);
if (rate < 0.9) Deno.exit(1);
