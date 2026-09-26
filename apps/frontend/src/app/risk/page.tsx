'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { Card, CardHeader, CardContent, PageLoader, StatCard } from '@/components/ui/common';
import { StatusBadge, TypeBadge, RiskBadge } from '@/components/contracts/contract-badges';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function RiskPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-portfolio'],
    queryFn: async () => (await api.get('/ai/portfolio')).data,
  });

  if (isLoading) return <ProtectedPage title="Contract Intelligence"><PageLoader /></ProtectedPage>;

  return (
    <ProtectedPage title="Contract Intelligence">
      <div className="space-y-6">
        {/* Coverage */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Contracts Analyzed"
            value={data ? `${data.coverage.pct}%` : '—'}
            icon="🧠"
            accent="bg-indigo-50 text-indigo-600"
            hint={`${data?.coverage?.analyzed ?? 0} of ${data?.coverage?.total ?? 0} contracts`}
          />
          <StatCard
            label="High Risk Contracts"
            value={data?.highRisk ?? 0}
            icon="⚠️"
            accent="bg-red-50 text-red-600"
          />
          <StatCard
            label="Expiring ≤ 90 days"
            value={data?.expiringWithin90Days ?? 0}
            icon="⏰"
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="AI Provider"
            value="Mock"
            icon="🤖"
            accent="bg-purple-50 text-purple-600"
            hint="Rule-based extractor (configurable)"
          />
        </div>

        {/* Top risks */}
        <Card>
          <CardHeader title="High-Risk Contracts" subtitle="Contracts flagged by the risk engine" />
          <CardContent>
            {data?.topRisks?.length ? (
              <div className="divide-y divide-slate-100">
                {data.topRisks.map((c: any) => (
                  <a
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-slate-50 -mx-2 rounded-lg px-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                      <p className="text-xs text-slate-400">{c.contractNo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.metadata?.riskFlags?.slice(0, 2).map((f: string) => (
                        <span key={f} className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          {f}
                        </span>
                      ))}
                      <RiskBadge score={c.metadata?.riskScore} />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                No high-risk contracts detected
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}