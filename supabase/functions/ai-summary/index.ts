// AI summary worker (STAGE4 §5). Invoked every minute by pg_cron while jobs are queued.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { z } from 'npm:zod@4';

import { admin, fail, isServiceCall, json } from '../_shared/http.ts';
import { buildUserMessage, FAIRNESS_SYSTEM, SUMMARY_VERSION, SYSTEM } from './prompt.ts';

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

const Fairness = z.object({
  fair: z.boolean(),
  problems: z.array(z.string()),
});

async function draftSummary(
  messages: Anthropic.MessageParam[],
  track: (u: { input_tokens: number; output_tokens: number }) => void,
) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'medium', format: zodOutputFormat(Summary) },
    system: SYSTEM,
    messages,
  });
  track(response.usage);
  if (response.stop_reason === 'refusal') throw new Error(`refusal: ${response.stop_details?.category ?? 'unknown'}`);
  if (!response.parsed_output) throw new Error(`unparseable output (stop_reason ${response.stop_reason})`);
  return response.parsed_output;
}

async function summarize(job: Job) {
  const majoritySide = job.votes_a >= job.votes_b ? 'a' : 'b';
  const minorityCount = job.reasons.filter((r) => r.side !== majoritySide).length;
  const minorityEnough = minorityCount >= MINORITY_MIN_REASONS;

  // Taste polls or polls whose reasons were all optional may have none.
  if (job.reasons.length === 0) {
    return { majority: null, minority: null, featured: [], usage: { input_tokens: 0, output_tokens: 0 } };
  }

  const pollText = buildUserMessage({
    question: job.question, labelA: job.label_a, labelB: job.label_b,
    votesA: job.votes_a, votesB: job.votes_b, reasons: job.reasons, minorityEnough,
  });
  const usage = { input_tokens: 0, output_tokens: 0 };
  const track = (u: { input_tokens: number; output_tokens: number }) => {
    usage.input_tokens += u.input_tokens;
    usage.output_tokens += u.output_tokens;
  };

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: pollText }];
  let out = await draftSummary(messages, track);

  // Fairness pass (STAGE4 §5 step 4): a separate check for left-out views; one revision at most.
  const check = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: 'medium', format: zodOutputFormat(Fairness) },
    system: FAIRNESS_SYSTEM,
    messages: [{ role: 'user', content: `${pollText}\n\n<summary>${JSON.stringify(out)}</summary>` }],
  });
  track(check.usage);
  if (check.stop_reason !== 'refusal' && check.parsed_output && !check.parsed_output.fair) {
    messages.push(
      { role: 'assistant', content: JSON.stringify(out) },
      { role: 'user', content: `Revise the summaries to fix these problems:\n- ${check.parsed_output.problems.join('\n- ')}` },
    );
    out = await draftSummary(messages, track);
  }

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
    usage,
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
