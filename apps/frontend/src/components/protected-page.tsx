'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoader } from '@/components/ui/common';

export function ProtectedPage({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) return <PageLoader />;
  if (!user) return null;

  return <AppShell activeTitle={title}>{children}</AppShell>;
}