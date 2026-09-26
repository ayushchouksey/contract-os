'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';
import { cn, getInitials, ROLE_LABELS } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/contracts', label: 'Contracts', icon: '📄' },
  { href: '/contracts/new', label: 'New Contract', icon: '➕' },
  { href: '/templates', label: 'Templates & Clauses', icon: '📋' },
  { href: '/workflows', label: 'Workflows', icon: '🔀' },
  { href: '/risk', label: 'Contract Intelligence', icon: '🛡️' },
  { href: '/team', label: 'Team', icon: '👥' },
];

export function AppShell({
  children,
  activeTitle,
}: {
  children: ReactNode;
  activeTitle?: string;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Contract OS</p>
            <p className="text-[10px] text-slate-400">Intelligence Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/contracts/new' &&
                item.href !== '/contracts' &&
                pathname.startsWith(item.href)) ||
              (item.href === '/contracts' && pathname.startsWith('/contracts/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.name}
              </p>
              <p className="truncate text-xs text-slate-400">
                {user ? ROLE_LABELS[user.role] ?? user.role : '—'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Logout"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              {activeTitle ?? 'Contract OS'}
            </h1>
            <p className="text-xs text-slate-400">{user?.org?.name ?? ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}