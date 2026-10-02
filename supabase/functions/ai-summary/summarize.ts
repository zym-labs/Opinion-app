// AI summary core (STAGE4 §5): draft → fairness check → validation. Used by the worker and the eval runner.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { z } from 'npm:zod@4';

import { buildUserMessage, FAIRNESS_SYSTEM, SYSTEM } from './prompt.ts';

export const MODEL = 'claude-sonnet-5-5';
const MINORITY_MIN_REASONS = 5;

// Each summary is 1–3 points; every point cites the reasons it comes from (STAGE6 v2: citation links).
const Point = z.object({ text: z.string(), reason_ids: z.array(z.string()) });
const Summary = z.object({
  majority_points: z.array(Point),
  minority_points: z.array(Point),
  featured_reason_ids: z.array(z.string()),
});
type Points = z.infer<typeof Point>[];

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

export type Side = 'a' | 'b' | 'c' | 'd';
export type Job = {
  job_id: string; poll_id: string; attempt: number; question: string; is_sensitive: boolean;
  /** 2–4 options with their vote counts. */
  options: { side: Side; label: string | null; votes: number }[];
  reasons: { id: string; side: Side; text: string; consent: boolean }[];
};

const Fairness = z.object({
  fair: z.boolean(),
  problems: z.array(z.string()),
});

async function draftSummary(
  messages: Anthropic.MessageParam[],
  track: (u: { input_tokens: number; output_tokens: number }) => void,
) {
  const response = await api().messages.parse({
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

export async function summarize(job: Job) {
  // Majority = the top option; minority = everyone who picked something else.
  const majoritySide = [...job.options].sort((x, y) => y.votes - x.votes)[0].side;
  const minorityCount = job.reasons.filter((r) => r.side !== majoritySide).length;
  const minorityEnough = minorityCount >= MINORITY_MIN_REASONS;

  // Taste polls or polls whose reasons were all optional may have none.
  if (job.reasons.length === 0) {
    return { majority: null, minority: null, points: null, featured: [], usage: { input_tokens: 0, output_tokens: 0 } };
  }

  const pollText = buildUserMessage({
    question: job.question, options: job.options, majoritySide, reasons: job.reasons, minorityEnough,
  });
  const usage = { input_tokens: 0, output_tokens: 0 };
  const track = (u: { input_tokens: number; output_tokens: number }) => {
    usage.input_tokens += u.input_tokens;
    usage.output_tokens += u.output_tokens;
  };

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: pollText }];
  let out = await draftSummary(messages, track);

  // Fairness pass (STAGE4 §5 step 4): a separate check for left-out views; one revision at most.
  const check = await api().messages.parse({
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

  // Validation (STAGE4 §5 step 3): keep only citations that exist and belong to the right side;
  // drop points left without any.
  const byId = new Map(job.reasons.map((r) => [r.id, r]));
  const clean = (points: Points, wantMajority: boolean) =>
    points
      .map((p) => ({
        text: p.text.trim().slice(0, 240),
        reason_ids: [...new Set(p.reason_ids)].filter(
          (id) => byId.has(id) && (byId.get(id)!.side === majoritySide) === wantMajority,
        ),
      }))
      .filter((p) => p.text && p.reason_ids.length > 0)
      .slice(0, 3);
  const majorityPoints = clean(out.majority_points, true);
  if (majorityPoints.length === 0) throw new Error('majority summary lacks valid citations');
  const minorityPoints = minorityEnough ? clean(out.minority_points, false) : [];
  // A minority point is shown against the option most of its cited reasons chose.
  const sideOf = (ids: string[]) => {
    const tally = new Map<Side, number>();
    for (const id of ids) tally.set(byId.get(id)!.side, (tally.get(byId.get(id)!.side) ?? 0) + 1);
    return [...tally.entries()].sort((x, y) => y[1] - x[1])[0][0];
  };

  let featured = [...new Set(out.featured_reason_ids)].filter((id) => byId.get(id)?.consent).slice(0, 3);
  // Guarantee one minority quote when the minority side is shown.
  if (minorityPoints.length && !featured.some((id) => byId.get(id)!.side !== majoritySide)) {
    const pick = minorityPoints.flatMap((p) => p.reason_ids).find((id) => byId.get(id)?.consent);
    if (pick) featured = [...featured.slice(0, 2), pick];
  }

  return {
    majority: majorityPoints.map((p) => p.text).join(' '),
    minority: minorityPoints.length ? minorityPoints.map((p) => p.text).join(' ') : null,
    points: [
      ...majorityPoints.map((p) => ({ side: majoritySide, ...p })),
      ...minorityPoints.map((p) => ({ side: sideOf(p.reason_ids), ...p })),
    ],
    featured: featured.map((id) => ({ id })),
    usage,
  };
}
