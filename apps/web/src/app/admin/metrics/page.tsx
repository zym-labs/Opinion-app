'use client';

// AD-07 Metrics, incl. the north star and launch go/no-go (STAGE7 Phase 8).
import { useState } from 'react';

import { useRpc } from '../use-rpc';

type Metrics = {
  polls_published: number;
  polls_closed: number;
  north_star_pct: number | null;
  median_minutes_to_first_vote: number | null;
  votes: number;
  new_users: number;
  active_voters: number;
  open_reports: number;
  oldest_open_report_hours: number | null;
  ai_failures: number;
};

function Tile({ label, value, target, ok }: { label: string; value: string; target?: string; ok?: boolean }) {
  return (
    <div className="card stack" style={{ gap: 4 }}>
      <span className="faint">{label}</span>
      <strong style={{ fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
      {target && (
        <span className="faint" style={{ color: ok === undefined ? undefined : ok ? 'var(--success)' : 'var(--danger)' }}>
          {ok === undefined ? '' : ok ? '✓ ' : '✗ '}Target {target}
        </span>
      )}
    </div>
  );
}

export default function MetricsPage() {
  const [days, setDays] = useState(7);
  const { data: m, error } = useRpc<Metrics>('admin_metrics', { p_days: days });
  const fmt = (v: number | null | undefined, suffix = '') => (v == null ? '—' : `${Math.round(Number(v) * 10) / 10}${suffix}`);

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>Metrics</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {m && (
        <div className="grid">
          <Tile label="Polls with ≥10 reasoned votes" value={fmt(m.north_star_pct, '%')} target="≥ 60%" ok={m.north_star_pct == null ? undefined : m.north_star_pct >= 60} />
          <Tile
            label="Median time to first vote"
            value={fmt(m.median_minutes_to_first_vote, ' min')}
            target="< 30 min"
            ok={m.median_minutes_to_first_vote == null ? undefined : m.median_minutes_to_first_vote < 30}
          />
          <Tile
            label="Oldest open report"
            value={fmt(m.oldest_open_report_hours, ' h')}
            target="< 24 h"
            ok={m.oldest_open_report_hours == null ? true : m.oldest_open_report_hours < 24}
          />
          <Tile label="Polls published" value={String(m.polls_published)} />
          <Tile label="Polls closed" value={String(m.polls_closed)} />
          <Tile label="Votes" value={String(m.votes)} />
          <Tile label="Active voters" value={String(m.active_voters)} />
          <Tile label="New users" value={String(m.new_users)} />
          <Tile label="Open reports" value={String(m.open_reports)} />
          <Tile label="AI failures" value={String(m.ai_failures)} />
        </div>
      )}
      <p className="faint">Retention (D1/D7/D30) and crash-free sessions come from PostHog and Sentry.</p>
    </div>
  );
}
