// AI summary worker (STAGE4 §5). Invoked every minute by pg_cron while jobs are queued.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { z } from 'npm:zod@4';

import { admin, fail, isServiceCall, json } from '../_shared/http.ts';
import { buildUserMessage, SUMMARY_VERSION, SYSTEM } from './prompt.ts';

const MODEL = 'claude-sonnet-5-5';
const MINORITY_MIN_REASONS = 5;

const Summary = z.object({
  majority: z.string(),
  majority_reason_ids: z.array(z.string()),
  minority: z.string().nullable(),
  minority_reason_ids: z.array(z.string()),
  featured_reason_ids: z.array(z.string()),
});

const client = new Anthropic();

type Job = {
  job_id: string; poll_id: string; attempt: number; question: string; is_sensitive: boolean;
  label_a: string | null; label_b: string | null; votes_a: number; votes_b: number;
  reasons: { id: string; side: 'a' | 'b'; text: string; consent: boolean }[];
};

async function summarize(job: Job) {
  const majoritySide = job.votes_a >= job.votes_b ? 'a' : 'b';
  const minorityCount = job.reasons.filter((r) => r.side !== majoritySide).length;
  const minorityEnough = minorityCount >= MINORITY_MIN_REASONS;

  // Taste polls or polls whose reasons were all optional may have none.
  if (job.reasons.length === 0) {
    return { majority: null, minority: null, featured: [], usage: { input_tokens: 0, output_tokens: 0 } };
  }

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'medium', format: zodOutputFormat(Summary) },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: buildUserMessage({
        question: job.question, labelA: job.label_a, labelB: job.label_b,
        votesA: job.votes_a, votesB: job.votes_b, reasons: job.reasons, minorityEnough,
      }),
    }],
  });
  if (response.stop_reason === 'refusal') throw new Error(`refusal: ${response.stop_details?.category ?? 'unknown'}`);
  const out = response.parsed_output;
  if (!out) throw new Error(`unparseable output (stop_reason ${response.stop_reason})`);

  // Validation (STAGE4 §5 step 3): citations must exist and match the right side.
  const byId = new Map(job.reasons.map((r) => [r.id, r]));
  const sideOk = (ids: string[], wantMajority: boolean) =>
    ids.length > 0 && ids.every((id) => byId.has(id) && (byId.get(id)!.side === majoritySide) === wantMajority);
  if (!sideOk(out.majority_reason_ids, true)) throw new Error('majority summary lacks valid citations');
  const minority = minorityEnough && out.minority && sideOk(out.minority_reason_ids, false) ? out.minority : null;

  let featured = [...new Set(out.featured_reason_ids)].filter((id) => byId.get(id)?.consent).slice(0, 3);
  // Guarantee one minority quote when the minority side is shown.
  if (minority && !featured.some((id) => byId.get(id)!.side !== majoritySide)) {
    const pick = out.minority_reason_ids.find((id) => byId.get(id)?.consent);
    if (pick) featured = [...featured.slice(0, 2), pick];
  }

  return {
    majority: out.majority.slice(0, 400),
    minority: minority?.slice(0, 400) ?? null,
    featured: featured.map((id) => ({ id })),
    usage: response.usage,
  };
}

Deno.serve(async (req) => {
  if (!isServiceCall(req)) return fail('UNAUTHENTICATED', 401);
  const { data: jobs, error } = await admin.rpc('claim_ai_jobs', { p_limit: 5 });
  if (error) return fail('INTERNAL', 500);

  const results = await Promise.allSettled((jobs as Job[]).map(async (job) => {
    try {
      const s = await summarize(job);
      const { error: e } = await admin.rpc('complete_ai_job', {
        p_job: job.job_id, p_majority: s.majority, p_minority: s.minority, p_featured: s.featured,
        p_model: `${MODEL}@v${SUMMARY_VERSION}`, p_tokens_in: s.usage.input_tokens,
        p_tokens_out: s.usage.output_tokens, p_reason_count: job.reasons.length,
      });
      if (e) throw e;
    } catch (e) {
      console.error('ai job failed', job.job_id, e);
      await admin.rpc('fail_ai_job', { p_job: job.job_id, p_error: String(e).slice(0, 500) });
      throw e;
    }
  }));
  return json({ processed: results.length, failed: results.filter((r) => r.status === 'rejected').length });
});
