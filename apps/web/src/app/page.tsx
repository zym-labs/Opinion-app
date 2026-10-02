import Link from 'next/link';

export default function Home() {
  return (
    <main className="container stack" style={{ gap: 32, paddingTop: 64 }}>
      <div className="row" aria-hidden>
        <span style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--option-a)' }} />
        <span style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--option-b)', marginLeft: -26 }} />
      </div>
      <h1 style={{ fontSize: 48, lineHeight: 1.1, margin: 0 }}>opinion</h1>
      <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Ask two options. Get real reasons.</p>
      <div className="stack prose muted">
        <p>
          Post a quick poll to people who know the topic or share your community. Everyone who votes says why.
          When the poll closes, an AI summary lays out the main arguments on both sides.
        </p>
        <p>Private by default. No followers, no likes, no public profiles. Polls last 3 to 24 hours.</p>
        <p>Opinion is for people 18 and over. Coming soon to iOS and Android.</p>
      </div>
      <footer className="row faint">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/guidelines">Community guidelines</Link>
        <Link href="/support">Support</Link>
      </footer>
    </main>
  );
}
