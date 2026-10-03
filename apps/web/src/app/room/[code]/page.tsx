// Room link landing page (QR codes). With the app installed, the universal link opens the room directly.
import type { Metadata } from 'next';

import { STORE } from '@/lib/public-api';

export const metadata: Metadata = { title: 'Join the room · Opinion', robots: { index: false } };

export default async function RoomLink({ params }: PageProps<'/room/[code]'>) {
  const { code } = await params;
  return (
    <main className="container stack" style={{ maxWidth: 520, paddingTop: 48 }}>
      <h1 style={{ margin: 0 }}>You’re invited to vote</h1>
      <p>Someone here is asking the room a quick question on Opinion. Votes are anonymous; the result shows when they reveal it.</p>
      <p className="muted">
        Room code: <strong>{code}</strong>
      </p>
      <a className="button primary" href={`opinion://room/${code}`}>
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
