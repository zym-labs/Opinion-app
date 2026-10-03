// Close friends link landing page. With the app installed, the universal link opens the app instead.
import type { Metadata } from 'next';

import { STORE } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'Join my close friends on Opinion',
  description: 'Get my quick questions and help me decide, anonymously.',
  robots: { index: false },
};

export default async function CircleLink({ params }: PageProps<'/f/[code]'>) {
  const { code } = await params;
  return (
    <main className="container stack" style={{ maxWidth: 520, paddingTop: 48 }}>
      <h1 style={{ margin: 0 }}>A friend added you to their close friends</h1>
      <p>Join to get their quick questions (where to eat, which plan, which outfit) and help them decide. Votes stay anonymous, even between friends.</p>
      <a className="button primary" href={`opinion://f/${code}`}>
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
