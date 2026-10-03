// Public result page (the asker chose to publish it). Indexable so people searching for the same
// decision can find what others chose and why. No identities; quotes only where voters consented.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublicResult, STORE } from '@/lib/public-api';

function verdict(options: { label: string | null; side: string; pct: number | null }[]) {
  const s = options.map((o) => ({ label: o.label ?? `Option ${o.side.toUpperCase()}`, pct: Number(o.pct ?? 0) })).sort((a, b) => b.pct - a.pct);
  if (s.length < 2) return null;
  const m = s[0].pct - s[1].pct;
  return m < 1 ? 'It depends: a dead heat' : m < 10 ? 'Split decision' : m < 30 ? `Leaning ${s[0].label}` : `Clear call: ${s[0].label}`;
}

export async function generateMetadata({ params }: PageProps<'/r/[code]'>): Promise<Metadata> {
  const r = await getPublicResult((await params).code);
  if (!r) return { title: 'Opinion', robots: { index: false } };
  const v = verdict(r.options);
  return {
    title: `${r.question} · ${r.total_votes} people answered · Opinion`,
    description: `${v ?? 'See what people chose'}. ${r.summary?.majority?.slice(0, 140) ?? ''}`,
    openGraph: { title: r.question, description: v ?? undefined },
  };
}

export default async function PublicResultPage({ params }: PageProps<'/r/[code]'>) {
  const r = await getPublicResult((await params).code);
  if (!r) notFound();
  const v = verdict(r.options);
  return (
    <main className="container stack" style={{ maxWidth: 620, paddingTop: 48 }}>
      <p className="muted">{r.total_votes} people answered anonymously on Opinion</p>
      <h1 style={{ margin: 0 }}>{r.question}</h1>
      {v && <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{v}</p>}
      <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
        {r.options.map((o) => (
          <li key={o.side} className="card row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontWeight: o.side === r.winner ? 600 : 400 }}>{o.label ?? `Option ${o.side.toUpperCase()}`}</span>
            <span>{Number(o.pct ?? 0).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
      {r.summary?.majority && (
        <section className="card stack">
          <strong>Most said</strong>
          <p style={{ margin: 0 }}>{r.summary.majority}</p>
          {r.summary.minority && (
            <>
              <strong>Others said</strong>
              <p style={{ margin: 0 }}>{r.summary.minority}</p>
            </>
          )}
          <p className="faint" style={{ margin: 0 }}>
            {r.summary.label} {r.summary.disclaimer ?? ''}
          </p>
        </section>
      )}
      {r.featured.length > 0 && (
        <section className="stack">
          <strong>In voters’ own words</strong>
          {r.featured.map((f) => (
            <blockquote key={f.id} style={{ margin: 0 }}>
              “{f.quote}”
            </blockquote>
          ))}
        </section>
      )}
      <p>Facing a decision of your own? Ask real people and get their reasons.</p>
      <div className="row">
        <a className="button primary" href={STORE.ios}>
          App Store
        </a>
        <a className="button" href={STORE.android}>
          Google Play
        </a>
      </div>
      <p className="faint">Opinion is for people aged 18 and over.</p>
    </main>
  );
}
