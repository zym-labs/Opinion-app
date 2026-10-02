'use client';

// AD-09 Appeals against moderation decisions (DSA Art. 20). Reversing restores the content and the account.
import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = {
  appeal_id: string;
  message: string;
  created_at: string;
  action: string;
  rule: string | null;
  action_note: string | null;
  decided_by: string | null;
  handle: string | null;
  question: string | null;
};

export default function Appeals() {
  const { data, error, reload } = useRpc<Row[]>('admin_appeals');

  function resolve(id: string, reverse: boolean) {
    const note = prompt(reverse ? 'Why reverse? (sent to the audit log)' : 'Why uphold? (sent to the audit log)');
    if (note === null) return;
    rpc('admin_resolve_appeal', { p_appeal: id, p_reverse: reverse, p_note: note })
      .then(reload)
      .catch((e) => alert(e instanceof Error ? e.message : 'Failed'));
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Appeals</h1>
      <p className="muted">Where possible, a different moderator from the one who decided should review the appeal.</p>
      {error && <p className="error">{error}</p>}
      {data?.length === 0 && <p className="muted">No open appeals.</p>}
      {data && data.length > 0 && (
        <table className="data">
          <thead>
            <tr>
              <th>User</th>
              <th>Decision</th>
              <th>Appeal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.appeal_id}>
                <td>@{r.handle ?? 'deleted'}</td>
                <td>
                  {r.action}
                  {r.rule ? ` · ${r.rule}` : ''}
                  {r.question && <div className="faint">{r.question}</div>}
                  <div className="faint">by @{r.decided_by ?? 'unknown'}{r.action_note ? `: ${r.action_note}` : ''}</div>
                </td>
                <td>
                  {r.message}
                  <div className="faint">{new Date(r.created_at).toLocaleString()}</div>
                </td>
                <td>
                  <button onClick={() => resolve(r.appeal_id, true)}>Reverse</button>{' '}
                  <button onClick={() => resolve(r.appeal_id, false)}>Uphold</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
