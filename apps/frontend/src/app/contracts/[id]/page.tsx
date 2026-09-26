'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { Card, CardHeader, CardContent, Button, PageLoader, Input, Textarea, Badge, Modal } from '@/components/ui/common';
import { StatusBadge, TypeBadge, PriorityBadge, RiskBadge } from '@/components/contracts/contract-badges';
import { formatDate, formatCurrency, cn, daysUntil } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [comment, setComment] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'versions' | 'documents' | 'approvals' | 'ai'>('overview');
  const [extracting, setExtracting] = useState(false);
  const [workflowInit, setWorkflowInit] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => (await api.get(`/contracts/${id}`)).data,
    enabled: Boolean(id),
  });

  const { data: related } = useQuery({
    queryKey: ['contract-related', id],
    queryFn: async () => (await api.get(`/contracts/${id}/related`)).data,
    enabled: Boolean(id),
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/comments`, { content: comment }),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    },
  });

  const initWorkflow = useMutation({
    mutationFn: () => api.post(`/workflows/contracts/${id}/init`),
    onSuccess: () => {
      toast.success('Approval workflow started');
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to start workflow'),
  });

  const act = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      api.put(`/workflows/contracts/${id}/approvals/${activeAction}/${action}`, {
        comment: approvalComment,
      }),
    onSuccess: () => {
      toast.success('Action recorded');
      setActiveAction(null);
      setApprovalComment('');
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Action failed'),
  });

  const runExtraction = async () => {
    setExtracting(true);
    try {
      await api.post(`/ai/contracts/${id}/extract`);
      toast.success('AI extraction complete');
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const meta = contract?.metadata;
  const approvals = contract?.approvals ?? [];
  const pending = approvals.find((a: any) => a.status === 'PENDING');

  const days = daysUntil(contract?.renewalDate ?? contract?.endDate);

  return (
    <ProtectedPage title={contract?.title ?? 'Contract'}>
      {isLoading ? (
        <PageLoader />
      ) : !contract ? (
        <p className="text-center text-slate-400 py-16">Contract not found</p>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{contract.title}</h2>
                <StatusBadge status={contract.status} />
                <PriorityBadge priority={contract.priority} />
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {contract.contractNo} · Created {formatDate(contract.createdAt)} · Owner:{' '}
                {contract.owner?.name ?? '—'}
              </p>
              {days !== null && days <= 90 && days >= 0 && (
                <p className="mt-2 inline-block rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                  ⚠️ Expires / renews in {days} days
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {contract.status !== 'PENDING_APPROVAL' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWorkflowInit(true);
                    initWorkflow.mutate();
                    setTimeout(() => setWorkflowInit(false), 600);
                  }}
                  disabled={workflowInit}
                >
                  ⚡ Start Approval
                </Button>
              )}
              {!meta || meta.extractionStatus === 'FAILED' ? (
                <Button size="sm" onClick={runExtraction} disabled={extracting}>
                  🧠 {extracting ? 'Analyzing...' : 'AI Analyze'}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={runExtraction} disabled={extracting}>
                  🔄 Re-analyze
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            {(['overview', 'versions', 'documents', 'approvals', 'ai'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-2 text-sm font-medium capitalize transition-colors',
                  tab === t
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader title="Contract Overview" />
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                    {[
                      ['Type', <TypeBadge key="t" type={contract.type} />],
                      ['Counterparty', contract.counterpartyName],
                      ['Entity', contract.entity || '—'],
                      ['Subsidiary', contract.subsidiary || '—'],
                      ['Value', formatCurrency(contract.value, contract.currency)],
                      ['Currency', contract.currency],
                      ['Start Date', formatDate(contract.startDate)],
                      ['End Date', formatDate(contract.endDate)],
                      ['Renewal Date', formatDate(contract.renewalDate)],
                      ['Auto Renew', contract.autoRenews ? 'Yes' : 'No'],
                      ['Jurisdiction', contract.jurisdiction || '—'],
                      ['Governing Law', contract.governingLaw || '—'],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="mt-1 text-sm text-slate-700 break-words">{value as any}</p>
                      </div>
                    ))}
                  </div>
                  {contract.description && (
                    <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      {contract.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Risk & Intelligence" />
                <CardContent>
                  {meta ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-xs font-medium text-slate-500">Risk Score</span>
                        <RiskBadge score={meta.riskScore} />
                      </div>
                      {meta.riskFlags?.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-medium text-slate-500">Risk Flags</p>
                          <div className="space-y-1.5">
                            {meta.riskFlags.map((flag: string) => (
                              <div
                                key={flag}
                                className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800"
                              >
                                <span>⚠️</span>
                                {flag}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {meta.summary && (
                        <div>
                          <p className="mb-1.5 text-xs font-medium text-slate-500">AI Summary</p>
                          <p className="rounded-md bg-indigo-50/60 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap">
                            {meta.summary}
                          </p>
                        </div>
                      )}
                      {meta.obligations?.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-xs font-medium text-slate-500">Detected Obligations</p>
                          <ul className="space-y-1">
                            {meta.obligations.map((o: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="mt-0.5 text-indigo-500">•</span>
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Analyzed {meta.extractedAt ? formatDate(meta.extractedAt) : '—'} ·{' '}
                        {meta.extractionStatus}
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-slate-400">Not analyzed yet</p>
                      <Button size="sm" className="mt-3" onClick={runExtraction} disabled={extracting}>
                        {' '}Analyze with AI
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {related?.length > 0 && (
                <Card className="lg:col-span-3">
                  <CardHeader title="Related Contracts" subtitle="Knowledge graph connections" />
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {related.map((r: any) => (
                        <a
                          key={r.id}
                          href={`/contracts/${r.id}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          {r.contractNo} · {r.counterpartyName}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {tab === 'approvals' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Approval Workflow" />
                <CardContent>
                  {approvals.length ? (
                    <div className="space-y-3">
                      {approvals.map((a: any, i: number) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-700">{a.stepName}</p>
                            <p className="text-xs text-slate-400">
                              {a.approver?.name ?? a.approverRole ?? 'Unassigned'}
                              {a.comment ? ` — "${a.comment}"` : ''}
                            </p>
                          </div>
                          <Badge
                            className={cn(
                              a.status === 'APPROVED' && 'bg-green-50 text-green-700 border-green-200',
                              a.status === 'REJECTED' && 'bg-red-50 text-red-700 border-red-200',
                              a.status === 'PENDING' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                            )}
                          >
                            {a.status}
                          </Badge>
                          {a.status === 'PENDING' && (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveAction(a.id);
                                  setApprovalComment('');
                                }}
                              >
                                Action
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-slate-400">No approval workflow started yet</p>
                      <Button size="sm" className="mt-3" onClick={() => initWorkflow.mutate()} disabled={workflowInit}>
                        Start approval workflow
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'versions' && (
            <Card>
              <CardHeader
                title="Versions"
                action={<Button size="sm" variant="outline">+ Add Version</Button>}
              />
              <CardContent>
                {contract.versions?.length ? (
                  <div className="space-y-3">
                    {contract.versions.map((v: any) => (
                      <div key={v.id} className="rounded-lg border border-slate-100 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-700">
                            v{v.version} — {v.name ?? `Version ${v.version}`}
                          </p>
                          <p className="text-xs text-slate-400">{formatDate(v.createdAt)}</p>
                        </div>
                        {v.summary && <p className="mt-1 text-xs text-slate-500">{v.summary}</p>}
                        {v.changes && (
                          <p className="mt-1 text-xs text-indigo-500">
                            Changed: {Object.keys(v.changes).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-400">No versions</p>
                )}
              </CardContent>
            </Card>
          )}

          {tab === 'documents' && (
            <Card>
              <CardHeader title="Documents" />
              <CardContent>
                {contract.documents?.length ? (
                  <div className="space-y-2">
                    {contract.documents.map((d: any) => (
                      <a
                        key={d.id}
                        href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/documents/${d.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📎</span>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{d.name}</p>
                            <p className="text-xs text-slate-400">
                              {(d.size / 1024).toFixed(1)} KB · {d.kind}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{formatDate(d.createdAt)}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-400">No documents uploaded</p>
                )}
              </CardContent>
            </Card>
          )}

          {tab === 'ai' && (
            <Card>
              <CardHeader
                title="AI Extraction"
                action={
                  <Button size="sm" onClick={runExtraction} disabled={extracting}>
                    {' '}
                    {extracting ? 'Analyzing...' : 'Run extraction'}
                  </Button>
                }
              />
              <CardContent>
                {meta ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ['Extracted Parties', meta.parties?.map((p: any) => (typeof p === 'string' ? p : p.name)).join(', ')],
                      ['Dates', Object.entries(meta.extractedDates ?? {}).map(([k, v]) => `${k}: ${v}`).join('; ')],
                      ['Liability Clause', meta.liability],
                      ['Indemnity', meta.indemnity],
                      ['Confidentiality', meta.confidentiality],
                      ['IP Ownership', meta.ipOwnership],
                      ['Termination', meta.termination],
                      ['Renewal', meta.renewal],
                      ['SLA', meta.sla],
                      ['Governing Law', contract.governingLaw],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">{value || '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No extraction results yet. Run AI extraction to analyze this contract.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* Approval action modal */}
      <Modal
        open={Boolean(activeAction)}
        onClose={() => setActiveAction(null)}
        title="Approval action"
      >
        <div className="space-y-4">
          <Textarea
            label="Comment (optional)"
            rows={3}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder="Add a note for the requester..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => act.mutate('reject')}>Reject</Button>
            <Button onClick={() => act.mutate('approve')}>Approve</Button>
          </div>
        </div>
      </Modal>
    </ProtectedPage>
  );
}