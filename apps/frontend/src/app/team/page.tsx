'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { Card, CardHeader, CardContent, PageLoader, Badge } from '@/components/ui/common';
import { getInitials, ROLE_LABELS, formatDate } from '@/lib/utils';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  ADMIN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  LEGAL: 'bg-blue-50 text-blue-700 border-blue-200',
  FINANCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PROCUREMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  SALES: 'bg-orange-50 text-orange-700 border-orange-200',
  VIEWER: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function TeamPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  return (
    <ProtectedPage title="Team">
      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users?.map((u: any) => (
            <Card key={u.id}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {getInitials(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{u.name}</p>
                  <p className="truncate text-xs text-slate-400">{u.email}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {u.lastLoginAt ? `Last login ${formatDate(u.lastLoginAt)}` : 'Never logged in'}
                  </p>
                </div>
                <Badge className={ROLE_COLORS[u.role] ?? ''}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ProtectedPage>
  );
}