'use client';

// AD-06 Polls whose AI summary failed after 3 attempts.
import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = { poll_id: string; question: string; error: string | null; attempts: number; finished_at: string | null };

export default function AiFailures() {
  const { data, error, reload } = useRpc<Row[]>('admin_failed_ai');
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>AI failures</h1>
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
                  <button onClick={async () => (await rpc('retry_ai', { p_poll: r.poll_id }), reload())}>Retry</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
