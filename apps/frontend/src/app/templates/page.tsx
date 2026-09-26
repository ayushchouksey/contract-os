'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { Card, CardHeader, CardContent, Button, PageLoader, Input, Textarea, Select, EmptyState, Modal, Badge } from '@/components/ui/common';
import { toast } from 'sonner';

function LoadFailed({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">
        Check that the server is awake, then try again.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'templates' | 'clauses'>('templates');
  const [showNew, setShowNew] = useState(false);
  const [category, setCategory] = useState('');
  const [renderFor, setRenderFor] = useState<any | null>(null);
  const [renderVars, setRenderVars] = useState<Record<string, string>>({});

  const {
    data: templates,
    isLoading: isLoadingTemplates,
    isError: isTemplatesError,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ['templates', category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : '';
      return (await api.get(`/templates${params}`)).data;
    },
  });

  const {
    data: clauses,
    isLoading: isLoadingClauses,
    isError: isClausesError,
    refetch: refetchClauses,
  } = useQuery({
    queryKey: ['clauses'],
    queryFn: async () => (await api.get('/clauses')).data,
  });

  const [form, setForm] = useState({ name: '', description: '', category: '', content: '', variables: '' });

  const createTemplate = useMutation({
    mutationFn: () =>
      api.post('/templates', {
        ...form,
        variables: form.variables.split(',').map((v) => v.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Template created');
      setShowNew(false);
      setForm({ name: '', description: '', category: '', content: '', variables: '' });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const openRender = (t: any) => {
    setRenderFor(t);
    const vars: Record<string, string> = {};
    (t.variables ?? []).forEach((v: string) => {
      vars[v] = v === 'EFFECTIVE_DATE' ? new Date().toISOString().slice(0, 10) : '';
    });
    setRenderVars(vars);
  };

  const renderContract = useMutation({
    mutationFn: () => api.post('/templates/render', { templateId: renderFor.id, variables: renderVars }),
    onSuccess: (res: any) => {
      toast.success('Contract drafted from template');
      window.open(`/contracts/${res.data.contract.id}`, '_blank');
      setRenderFor(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  return (
    <ProtectedPage title="Templates & Clause Library">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setTab('templates')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'templates' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
            >
              Templates
            </button>
            <button
              onClick={() => setTab('clauses')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'clauses' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
            >
              Clause Library
            </button>
          </div>
          {tab === 'templates' && (
            <Button onClick={() => setShowNew(true)}>+ New Template</Button>
          )}
        </div>

        {tab === 'templates' ? (
          isLoadingTemplates ? (
            <PageLoader />
          ) : isTemplatesError ? (
            <LoadFailed label="Couldn't load templates" onRetry={refetchTemplates} />
          ) : templates?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t: any) => (
                <Card key={t.id} className="flex flex-col">
                  <CardHeader
                    title={t.name}
                    subtitle={t.category ?? 'Uncategorized'}
                    action={t.isDefault ? <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200">Default</Badge> : null}
                  />
                  <CardContent className="flex flex-1 flex-col">
                    {t.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                    )}
                    <p className="mt-3 text-[10px] font-medium uppercase text-slate-400">
                      v{t.version} · {t.variables?.length ?? 0} variables
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(t.variables ?? []).slice(0, 5).map((v: string) => (
                        <span key={v} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{v}</span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openRender(t)}>
                        Draft from template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No templates" description="Create your first template to accelerate contract creation." />
          )
        ) : isLoadingClauses ? (
          <PageLoader />
        ) : isClausesError ? (
          <LoadFailed label="Couldn't load clauses" onRetry={refetchClauses} />
        ) : clauses?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {clauses.map((c: any) => (
              <Card key={c.id}>
                <CardHeader title={c.name} subtitle={c.category ?? 'General'} />
                <CardContent>
                  <p className="text-xs leading-relaxed text-slate-600 line-clamp-4">{c.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No clauses in library" />
        )}
      </div>

      {/* New template modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Template">
        <div className="space-y-4">
          <Input label="Template Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard NDA" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="NDA" />
            <Input label="Variables (comma-separated)" value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} placeholder="{{PARTY_A}},{{PARTY_B}}" />
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
          <Textarea label="Template Content" rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Use {{VARIABLES}} for placeholders..." />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => createTemplate.mutate()} disabled={!form.name || !form.content}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Render modal */}
      <Modal open={Boolean(renderFor)} onClose={() => setRenderFor(null)} title={`Draft from ${renderFor?.name ?? ''}`}>
        <div className="space-y-4">
          {(renderFor?.variables ?? []).map((v: string) => (
            <Input
              key={v}
              label={v}
              value={renderVars[v] ?? ''}
              onChange={(e) => setRenderVars({ ...renderVars, [v]: e.target.value })}
              placeholder={`Value for ${v}`}
            />
          ))}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRenderFor(null)}>Cancel</Button>
            <Button onClick={() => renderContract.mutate()} disabled={renderContract.isPending}>Generate Contract</Button>
          </div>
        </div>
      </Modal>
    </ProtectedPage>
  );
}