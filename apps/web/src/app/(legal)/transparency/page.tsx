// Public transparency report: how moderation is going, in totals only. Refreshed hourly.
import { getTransparency } from '@/lib/public-api';

export const metadata = { title: 'Transparency report · Opinion' };
export const revalidate = 3600;

const ACTIONS: Record<string, string> = {
  remove: 'Content removed',
  warn: 'Warnings',
  suspend: 'Accounts suspended',
  dismiss: 'Reports dismissed (no rule broken)',
  restore: 'Decisions reversed',
};

export default async function Transparency() {
  const t = await getTransparency();
  if (!t) return <p>The transparency report is temporarily unavailable.</p>;
  return (
    <div>
      <h1>Transparency report</h1>
      <p>
        The last {t.period_days} days on Opinion. Totals only: no polls, reasons or people are identified. We publish this
        so students, universities and parents can see how we keep Opinion safe.
      </p>
      <ul>
        <li>Polls published: {t.polls_published}</li>
        <li>Reports received: {t.reports}</li>
        {Object.entries(ACTIONS).map(([k, label]) => (
          <li key={k}>
            {label}: {t.actions[k] ?? 0}
          </li>
        ))}
        <li>
          Appeals: {t.appeals} ({t.appeals_reversed} reversed)
        </li>
        <li>Median time from report to decision: {t.median_hours_to_action ?? '—'} hours</li>
        <li>AI summaries flagged by readers: {t.summaries_flagged}</li>
      </ul>
      <h2>How we keep it safe</h2>
      <ul>
        <li>Questions only, with 2–4 fixed options. No comments, replies or location feeds.</li>
        <li>Questions about identifiable private people are blocked before they’re posted.</li>
        <li>Every question and reason is checked automatically; personal details are removed from reasons.</li>
        <li>Results appear only with 10+ votes, so no one’s vote can be singled out.</li>
        <li>Mentions of self-harm show crisis helplines instead of being posted.</li>
        <li>Anyone can report; every decision can be appealed and is reviewed by a person.</li>
      </ul>
      <p className="faint">Generated {new Date(t.generated_at).toUTCString()}.</p>
    </div>
  );
}
