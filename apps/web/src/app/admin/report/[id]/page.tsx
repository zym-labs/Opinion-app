'use client';

// AD-03 Item review: content, reports, author history; dismiss / remove / warn / suspend.
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { imageUrl, rpc } from '@/lib/supabase';

import { useRpc } from '../../use-rpc';

type Item = {
  report: { id: string; target_type: string; status: string };
  reports: { reason: string; note: string | null; created_at: string }[];
  poll: { id: string; question: string; status: string; type: string;
          options: { side: string; label: string | null; image_path: string | null }[] } | null;
  content: string | null;
  author: { id: string; handle: string; status: string; created_at: string; strikes: number } | null;
};

// Rule names shown to authors in their statement of reasons (match COMMUNITY_GUIDELINES.md).
const RULES = [
  ['harassment', 'Targets or identifies a private person'],
  ['personal_info', 'Shares personal information'],
  ['hate', 'Hate'],
  ['sexual', 'Sexual content'],
  ['self_harm', 'Encourages self-harm or dangerous acts'],
  ['spam', 'Spam, advertising or vote coordination'],
  ['ai_manipulation', 'Tries to manipulate the AI summary'],
  ['misleading_expertise', 'Misleading claims of expertise'],
  ['illegal', 'Illegal content'],
] as const;

function OptionImage({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    imageUrl(path).then(setSrc);
  }, [path]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="Poll option" style={{ maxWidth: 160, borderRadius: 12 }} /> : null;
}

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error } = useRpc<Item>('admin_item', { p_report: id });
  const [rule, setRule] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  async function act(action: 'dismiss' | 'remove' | 'warn' | 'suspend') {
    if (action === 'suspend' && !confirm('Suspend this account? They will be signed out of all features.')) return;
    setBusy(true);
    try {
      await rpc('admin_act', { p_report: id, p_action: action, p_rule: rule || null, p_note: note || null });
      router.push('/admin');
    } catch (e) {
      setActError(e instanceof Error ? e.message : 'Error');
      setBusy(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 style={{ margin: 0 }}>Review {data.report.target_type.replace('_', ' ')}</h1>

      {data.poll && (
        <section className="card stack">
          <span className="faint">
            Poll · {data.poll.type} · {data.poll.status}
          </span>
          <strong>{data.poll.question}</strong>
          <div className="row">
            {data.poll.options?.map((o) => (
              <div key={o.side} className="stack" style={{ gap: 4 }}>
                <span>
                  <strong>{o.side.toUpperCase()}</strong> {o.label}
                </span>
                {o.image_path && <OptionImage path={o.image_path} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.content && (
        <section className="card stack">
          <span className="faint">Reported text</span>
          <blockquote style={{ margin: 0, fontStyle: 'italic' }}>“{data.content}”</blockquote>
        </section>
      )}

      <section className="stack">
        <h2 style={{ margin: 0 }}>Reports ({data.reports.length})</h2>
        {data.reports.map((r, i) => (
          <div key={i} className="faint">
            {new Date(r.created_at).toLocaleString()} · {r.reason.replace('_', ' ')}
            {r.note ? ` — “${r.note}”` : ''}
          </div>
        ))}
      </section>

      {data.author && (
        <section className="card stack">
          <span className="faint">Author (internal only)</span>
          <span>
            {data.author.handle} · {data.author.status} · joined {new Date(data.author.created_at).toLocaleDateString()} ·{' '}
            {data.author.strikes} previous strikes
          </span>
        </section>
      )}

      {data.report.status === 'open' ? (
        <section className="stack">
          <label className="stack">
            Rule broken (required to remove, warn or suspend; shown to the author)
            <select value={rule} onChange={(e) => setRule(e.target.value)}>
              <option value="">Choose a rule…</option>
              {RULES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="stack">
            Internal note (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
          <div className="row">
            <button disabled={busy} onClick={() => act('dismiss')}>
              Dismiss
            </button>
            <button disabled={busy || !rule} onClick={() => act('warn')}>
              Warn author
            </button>
            <button className="primary" disabled={busy || !rule} onClick={() => act('remove')}>
              Remove content
            </button>
            <button className="danger" disabled={busy || !rule} onClick={() => act('suspend')}>
              Remove + suspend
            </button>
          </div>
          {actError && <p className="error">{actError}</p>}
        </section>
      ) : (
        <p className="muted">This report has been {data.report.status}.</p>
      )}
    </div>
  );
}
