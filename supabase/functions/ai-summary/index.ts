// AI summary worker (STAGE4 §5). Invoked every minute by pg_cron while jobs are queued.
import { admin, fail, isServiceCall, json } from '../_shared/http.ts';
import { SUMMARY_VERSION } from './prompt.ts';
import { type Job, MODEL, summarize } from './summarize.ts';

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
        p_tokens_out: s.usage.output_tokens, p_reason_count: job.reasons.length, p_points: s.points,
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
