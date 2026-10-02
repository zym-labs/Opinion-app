import Link from 'next/link';

export default function LegalLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="container">
      <Link href="/" className="faint">
        ← opinion
      </Link>
      <article className="prose">{children}</article>
    </main>
  );
}
