// Friend vote link landing page. With the app installed, the universal link opens the app instead.
import type { Metadata } from 'next';

import { getInvitePreview, STORE } from '@/lib/public-api';

export async function generateMetadata({ params }: PageProps<'/p/[code]'>): Promise<Metadata> {
  const poll = await getInvitePreview((await params).code);
  return {
    title: poll ? `${poll.question} · Opinion` : 'Opinion',
    description: 'Help a friend decide. Vote anonymously and say why.',
    robots: { index: false },
  };
}

export default async function PollLink({ params }: PageProps<'/p/[code]'>) {
  const { code } = await params;
  const poll = await getInvitePreview(code);
  return (
    <main className="container stack" style={{ maxWidth: 520, paddingTop: 48 }}>
      {poll ? (
        <>
          <p className="muted">A friend wants your opinion</p>
          <h1 style={{ margin: 0 }}>{poll.question}</h1>
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {poll.options.map((o) => (
              <li key={o.side} className="card">
                {o.label ?? `Option ${o.side.toUpperCase()}`}
              </li>
            ))}
          </ul>
          <p className="muted">
            Votes are anonymous: your friend never sees how you voted. Closes {new Date(poll.closes_at).toUTCString()}.
          </p>
        </>
      ) : (
        <h1>This poll has closed</h1>
      )}
      <a className="button primary" href={`opinion://p/${code}`}>
        Open in the app
      </a>
      <div className="row">
        <a href={STORE.ios}>App Store</a>
        <a href={STORE.android}>Google Play</a>
      </div>
      <p className="faint">Opinion is for people aged 18 and over.</p>
    </main>
  );
}
