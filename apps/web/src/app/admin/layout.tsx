'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { supabase } from '@/lib/supabase';

import { AuthGate } from './auth-gate';

const NAV = [
  ['/admin', 'Queue'],
  ['/admin/appeals', 'Appeals'],
  ['/admin/users', 'Users'],
  ['/admin/communities', 'Communities'],
  ['/admin/seed', 'Seed polls'],
  ['/admin/starters', 'Starter polls'],
  ['/admin/experts', 'Experts'],
  ['/admin/ai', 'AI failures'],
  ['/admin/metrics', 'Metrics'],
] as const;

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const path = usePathname();
  return (
    <AuthGate>
      <div className="container">
        <nav className="admin" aria-label="Admin">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
              {label}
            </Link>
          ))}
          <button style={{ marginLeft: 'auto' }} onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </nav>
        {children}
      </div>
    </AuthGate>
  );
}
