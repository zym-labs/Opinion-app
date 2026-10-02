'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

import { AuthGate } from './auth-gate';
import { useRpc } from './use-rpc';

// Third item: key into admin_queue_counts for an open-items badge.
const NAV: readonly (readonly [string, string, ('reports' | 'appeals' | 'ai')?])[] = [
  ['/admin', 'Queue', 'reports'],
  ['/admin/appeals', 'Appeals', 'appeals'],
  ['/admin/users', 'Users'],
  ['/admin/communities', 'Communities'],
  ['/admin/seed', 'Seed polls'],
  ['/admin/starters', 'Starter polls'],
  ['/admin/experts', 'Experts'],
  ['/admin/ai', 'AI failures', 'ai'],
  ['/admin/metrics', 'Metrics'],
];

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // Refetched on every navigation, so counts drop as items are handled.
  const { data: counts, reload } = useRpc<Record<string, number>>('admin_queue_counts');
  useEffect(() => {
    reload();
  }, [path, reload]);
  return (
    <>
      <div className="container">
        <nav className="admin" aria-label="Admin">
          {NAV.map(([href, label, count]) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
              {label}
              {count && counts?.[count] ? <span className="badge" style={{ marginLeft: 6 }}>{counts[count]}</span> : null}
            </Link>
          ))}
          <button style={{ marginLeft: 'auto' }} onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </nav>
        {children}
      </div>
    </>
  );
}
