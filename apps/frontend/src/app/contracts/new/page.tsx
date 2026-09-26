'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { Card, CardHeader, CardContent, Input, Select, Textarea, Button } from '@/components/ui/common';
import { toast } from 'sonner';

const CONTRACT_TYPES = ['NDA', 'MSA', 'SOW', 'VENDOR', 'PURCHASE', 'SALES', 'LEASE', 'EMPLOYMENT', 'CONSENT', 'AMENDMENT', 'OTHER'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

const emptyForm = {
  title: '',
  type: 'NDA',
  counterpartyName: '',
  counterpartyEmail: '',
  entity: '',
  subsidiary: '',
  value: '',
  currency: 'INR',
  tenureYears: '',
  startDate: '',
  endDate: '',
  renewalDate: '',
  autoRenews: false,
  jurisdiction: '',
  governingLaw: '',
  businessJustification: '',
  requestTrackingNumber: '',
  priority: 'MEDIUM',
  ownerId: '',
  templateId: '',
};

export default function NewContractPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Require at least title + counterparty
    if (!form.title.trim() || !form.counterpartyName.trim()) {
      toast.error('Title and Counterparty are required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        value: form.value ? Number(form.value) : undefined,
        tenureYears: form.tenureYears ? Number(form.tenureYears) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        renewalDate: form.renewalDate || undefined,
        ownerId: form.ownerId || undefined,
        templateId: form.templateId || undefined,
      };
      const res = await api.post('/contracts', payload);
      toast.success('Contract created');
      router.push(`/contracts/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedPage title="New Contract Intake">
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
        {/* Core details */}
        <Card>
          <CardHeader title="Contract Details" subtitle="Core information about the contract" />
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Contract Title *"
                  placeholder="e.g. Master Services Agreement – DataWorks"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  required
                />
              </div>
              <Select label="Contract Type *" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select label="Priority" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
              <div className="sm:col-span-2">
                <Input
                  label="Template (optional)"
                  placeholder="Start from a template"
                  value={form.templateId}
                  onChange={(e) => set('templateId', e.target.value)}
                  list="template-list"
                />
                <datalist id="template-list">
                  {(templates ?? []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </datalist>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader title="Parties" subtitle="Counterparty and entity details" />
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Counterparty Name *"
                  placeholder="e.g. DataWorks Analytics Ltd"
                  value={form.counterpartyName}
                  onChange={(e) => set('counterpartyName', e.target.value)}
                  required
                />
              </div>
              <Input
                label="Counterparty Email"
                type="email"
                placeholder="legal@counterparty.com"
                value={form.counterpartyEmail}
                onChange={(e) => set('counterpartyEmail', e.target.value)}
              />
              <Input
                label="Legal Entity"
                placeholder="e.g. Acme Corp Pvt Ltd"
                value={form.entity}
                onChange={(e) => set('entity', e.target.value)}
              />
              <Input
                label="Subsidiary"
                placeholder="e.g. Acme Mumbai Branch"
                value={form.subsidiary}
                onChange={(e) => set('subsidiary', e.target.value)}
              />
              <Select label="Owner" value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
                <option value="">Select owner</option>
                {(users ?? []).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Commercial */}
        <Card>
          <CardHeader title="Commercial & Tenure" subtitle="Value, duration and dates" />
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Value"
                type="number"
                placeholder="4500000"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
              />
              <Select label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input
                label="Tenure (years)"
                type="number"
                placeholder="2"
                value={form.tenureYears}
                onChange={(e) => set('tenureYears', e.target.value)}
              />
              <label className="flex items-center gap-2 pt-6 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.autoRenews}
                  onChange={(e) => set('autoRenews', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                Auto-renews
              </label>
              <Input
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
              <Input
                label="Renewal Date"
                type="date"
                value={form.renewalDate}
                onChange={(e) => set('renewalDate', e.target.value)}
              />
              <Input
                label="Jurisdiction"
                placeholder="e.g. Karnataka"
                value={form.jurisdiction}
                onChange={(e) => set('jurisdiction', e.target.value)}
              />
              <Input
                label="Governing Law"
                placeholder="e.g. India"
                value={form.governingLaw}
                onChange={(e) => set('governingLaw', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Intake context */}
        <Card>
          <CardHeader title="Request Context" subtitle="Why is this contract needed?" />
          <CardContent>
            <div className="grid gap-4">
              <Textarea
                label="Business Justification"
                placeholder="Describe the business need for this contract..."
                rows={3}
                value={form.businessJustification}
                onChange={(e) => set('businessJustification', e.target.value)}
              />
              <Input
                label="Request Tracking Number"
                placeholder="e.g. REQ-2026-0042"
                value={form.requestTrackingNumber}
                onChange={(e) => set('requestTrackingNumber', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Contract'}
          </Button>
        </div>
      </form>
    </ProtectedPage>
  );
}