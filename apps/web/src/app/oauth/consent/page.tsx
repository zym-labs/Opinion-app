// OAuth consent page for AI assistants (ChatGPT, Claude) connecting to Opinion through the MCP server.
// Supabase Auth's OAuth 2.1 server redirects here with ?authorization_id=…
import type { Metadata } from 'next';

import { Consent } from './consent';

export const metadata: Metadata = { title: 'Connect an app · Opinion', robots: { index: false } };

export default async function ConsentPage({ searchParams }: PageProps<'/oauth/consent'>) {
  const raw = (await searchParams).authorization_id;
  const authorizationId = typeof raw === 'string' ? raw : null;
  return (
    <main className="container stack" style={{ maxWidth: 480, paddingTop: 56 }}>
      {authorizationId ? <Consent authorizationId={authorizationId} /> : <p>This link is missing its authorization request. Start again from the app you were connecting.</p>}
    </main>
  );
}
