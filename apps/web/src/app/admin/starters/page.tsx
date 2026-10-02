'use client';

// Starter polls: up to 3 completed polls newcomers can try before signing up (STAGE6 v2).
import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = { id: string; question: string; total_votes: number; is_starter: boolean; closes_at: string };

export default function Starters() {
  const { data, error, reload } = useRpc<Row[]>('admin_completed_polls');
  const chosen = data?.filter((r) => r.is_starter).length ?? 0;

  async function toggle(r: Row) {
    await rpc('admin_set_starter', { p_poll: r.id, p_starter: !r.is_starter });
    reload();
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Starter polls</h1>
      <p className="muted">
        Newcomers vote on these before signing up and see the full result reveal. Pick 3 completed polls with a clear
        question, a good AI summary and featured quotes. The 3 newest starters are shown. Selected: {chosen}.
      </p>
      {error && <p className="error">{error}</p>}
      <table className="data">
        <thead>
          <tr>
            <th>Question</th>
            <th>Votes</th>
            <th>Closed</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.map((r) => (
            <tr key={r.id}>
              <td>
                {r.question} {r.is_starter && <span className="badge">starter</span>}
              </td>
              <td>{r.total_votes}</td>
              <td className="faint">{new Date(r.closes_at).toLocaleDateString()}</td>
              <td>
                <button className={r.is_starter ? '' : 'primary'} onClick={() => toggle(r)}>
                  {r.is_starter ? 'Remove' : 'Make starter'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
