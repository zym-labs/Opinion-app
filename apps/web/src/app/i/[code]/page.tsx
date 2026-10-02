// Friend invite landing page.
import type { Metadata } from 'next';

import { STORE } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'You’re invited to Opinion',
  description: 'Get honest, anonymous opinions on your decisions.',
  robots: { index: false },
};

export default async function InviteLink({ params }: PageProps<'/i/[code]'>) {
  const { code } = await params;
  return (
    <main className="container stack" style={{ maxWidth: 520, paddingTop: 48 }}>
      <h1 style={{ margin: 0 }}>You’re invited to Opinion</h1>
      <p>Ask a question with 2–4 options. Real people vote anonymously and say why; AI sums up both sides.</p>
      <p className="muted">
        Join with this link and vote on 3 polls: you and your friend each get a free poll. If the app doesn’t pick the
        invite up, enter the code <strong>{code}</strong> under Credits within 7 days of signing up.
      </p>
      <a className="button primary" href={`opinion://i/${code}`}>
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
