'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { StatCard, Card, CardHeader, CardContent, Button, PageLoader, Spinner } from '@/components/ui/common';
import { StatusBadge, TypeBadge } from '@/components/contracts/contract-badges';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

interface DashboardStats {
  total: number;
  drafts: number;
  pendingApproval: number;
  executed: number;
  expiring: number;
  renewedSoon: number;
  pendingApprovals: any[];
  recent: any[];
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/contracts/dashboard/stats')).data,
  });

  if (isLoading) return <ProtectedPage title="Dashboard"><PageLoader /></ProtectedPage>;

  const stats = data ?? null;

  return (
    <ProtectedPage title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Contracts"
            value={stats?.total ?? 0}
            icon="📚"
            accent="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Pending Approval"
            value={stats?.pendingApproval ?? 0}
            icon="⏳"
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Executed"
            value={stats?.executed ?? 0}
            icon="✅"
            accent="bg-green-50 text-green-600"
          />
          <StatCard
            label="Expiring ≤ 3 months"
            value={stats?.expiring ?? 0}
            icon="⏰"
            accent="bg-red-50 text-red-600"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Recent Contracts"
              action={
                <Button variant="outline" size="sm">
                  <Link href="/contracts">View all</Link>
                </Button>
              }
            />
            <CardContent>
              {stats?.recent?.length ? (
                <div className="divide-y divide-slate-100">
                  {stats.recent.map((c) => (
                    <Link
                      key={c.id}
                      href={`/contracts/${c.id}`}
                      className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {c.contractNo} · {c.counterpartyName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <TypeBadge type={c.type} />
                        <StatusBadge status={c.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-sm text-slate-400">No contracts yet</p>
                  <Button size="sm" className="mt-3">
                    <Link href="/contracts/new">Create your first contract</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Pending Approvals" />
            <CardContent>
              {stats?.pendingApprovals?.length ? (
                <div className="space-y-3">
                  {stats.pendingApprovals.map((a) => (
                    <Link
                      key={a.id}
                      href={`/contracts/${a.contractId}`}
                      className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <p className="truncate text-sm font-medium text-slate-800">
                        {a.contract?.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {a.stepName} · {a.contract?.contractNo}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">
                  No pending approvals 🎉
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedPage>
  );
}