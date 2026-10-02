'use client';

// AD-06 Polls whose AI summary failed after 3 attempts.
import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = { poll_id: string; question: string; error: string | null; attempts: number; finished_at: string | null };

type Flagged = { poll_id: string; question: string; flags: number; total_votes: number; summary_majority: string | null; summary_minority: string | null };

/** Summaries that voters or askers said seem off. Use these to tune the prompt and fairness pass. */
function FlaggedSummaries() {
  const { data, error } = useRpc<Flagged[]>('admin_flagged_summaries');
  return (
    <section className="stack">
      <h2 style={{ margin: 0, fontSize: 18 }}>Summaries flagged as off</h2>
      {error && <p className="error">{error}</p>}
      {data?.length === 0 && <p className="muted">No flags.</p>}
      {data?.map((f) => (
        <div key={f.poll_id} className="card stack">
          <strong>
            {f.question} <span className="badge">{f.flags} flags</span>
          </strong>
          <span className="faint">{f.total_votes} votes</span>
          <span>Most said: {f.summary_majority ?? '—'}</span>
          <span>Others said: {f.summary_minority ?? '—'}</span>
        </div>
      ))}
    </section>
  );
}

export default function AiFailures() {
  const { data, error, reload } = useRpc<Row[]>('admin_failed_ai');
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>AI quality</h1>
      <h2 style={{ margin: 0, fontSize: 18 }}>Failed summaries</h2>
      <p className="muted">Voters already see these results without a summary. Retrying re-queues the summary.</p>
      {error && <p className="error">{error}</p>}
      {data?.length === 0 && <p className="muted">No failures.</p>}
      {data && data.length > 0 && (
        <table className="data">
          <thead>
            <tr>
              <th>Poll</th>
              <th>Last error</th>
              <th>Attempts</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.poll_id}>
                <td>{r.question}</td>
                <td className="faint">{r.error ?? '—'}</td>
                <td>{r.attempts}</td>
                <td>
                  <button
                    onClick={() =>
                      rpc('retry_ai', { p_poll: r.poll_id })
                        .then(reload)
                        .catch((e) => alert(e instanceof Error ? e.message : 'Retry failed'))
                    }>
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <FlaggedSummaries />
    </div>
  );
}
