'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { Card, Button, PageLoader, Input, Select, EmptyState } from '@/components/ui/common';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/contracts/contract-badges';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', { search, status, type }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      params.set('take', '100');
      return (await api.get(`/contracts?${params.toString()}`)).data;
    },
  });

  const contracts = data?.items ?? [];

  return (
    <ProtectedPage title="Contracts">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by title, number, counterparty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
              <option value="">All Statuses</option>
              {['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'TERMINATED', 'EXPIRED', 'ARCHIVED'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40">
              <option value="">All Types</option>
              {['NDA', 'MSA', 'SOW', 'VENDOR', 'PURCHASE', 'SALES', 'LEASE', 'EMPLOYMENT', 'AMENDMENT', 'OTHER'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <Button>
            <Link href="/contracts/new">+ New Contract</Link>
          </Button>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : contracts.length ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Contract</th>
                    <th className="px-4 py-3 font-medium">Counterparty</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                    <th className="px-4 py-3 font-medium">Expiry</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {contracts.map((c: any) => (
                    <tr key={c.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => router.push(`/contracts/${c.id}`)}>
                      <td className="px-5 py-3.5">
                        <span className="block truncate font-medium text-indigo-600">
                          {c.title}
                        </span>
                        <p className="mt-0.5 text-xs text-slate-400">{c.contractNo}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{c.counterpartyName}</td>
                      <td className="px-4 py-3.5"><TypeBadge type={c.type} /></td>
                      <td className="px-4 py-3.5 text-slate-600">{formatCurrency(c.value, c.currency)}</td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {formatDate(c.renewalDate ?? c.endDate)}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="No contracts found"
            description="Create your first contract or adjust your filters."
            action={
              <Button>
                <Link href="/contracts/new">Create a contract</Link>
              </Button>
            }
          />
        )}
      </div>
    </ProtectedPage>
  );
}