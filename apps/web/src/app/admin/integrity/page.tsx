'use client';

// AD-11 Possible coordinated voting: 8+ votes for one option within 10 minutes, all from accounts
// under 7 days old. Look at the poll and the accounts before acting; nothing is removed automatically.
import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = { id: string; poll_id: string; question: string; side: string; votes: number; window_start: string };

export default function Integrity() {
  const { data, error, reload } = useRpc<Row[]>('admin_integrity_flags');
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Integrity</h1>
      <p className="muted">
        Bursts of votes from brand-new accounts. Often harmless (a class sharing a link), sometimes a brigade. If it’s
        abuse, suspend the accounts from Users with the spam rule.
      </p>
      {error && <p className="error">{error}</p>}
      {data?.length === 0 && <p className="muted">Nothing to review.</p>}
      {data && data.length > 0 && (
        <table className="data">
          <thead>
            <tr>
              <th>Poll</th>
              <th>Option</th>
              <th>Votes</th>
              <th>Window</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>{r.question}</td>
                <td>{r.side.toUpperCase()}</td>
                <td>{r.votes}</td>
                <td className="faint">{new Date(r.window_start).toLocaleString()}</td>
                <td>
                  <button
                    onClick={() =>
                      rpc('admin_review_integrity_flag', { p_flag: r.id })
                        .then(reload)
                        .catch((e) => alert(e instanceof Error ? e.message : 'Failed'))
                    }>
                    Reviewed
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
