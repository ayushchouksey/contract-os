'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { Card, CardHeader, CardContent, Button, PageLoader, Badge } from '@/components/ui/common';
import { toast } from 'sonner';

const STEP_COLORS: Record<string, string> = {
  APPROVAL: 'bg-blue-50 text-blue-700 border-blue-200',
  NOTIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
  COUNTER_SIGN: 'bg-amber-50 text-amber-700 border-amber-200',
  E_SIGNATURE: 'bg-green-50 text-green-700 border-green-200',
  TASK: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => (await api.get('/workflows')).data,
  });

  const initWorkflow = useMutation({
    mutationFn: (contractId: string) => api.post(`/workflows/contracts/${contractId}/init`),
    onSuccess: () => {
      toast.success('Workflow initiated');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  return (
    <ProtectedPage title="Approval Workflows">
      <div className="space-y-4">
        {isLoading ? (
          <PageLoader />
        ) : workflows?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {workflows.map((wf: any) => (
              <Card key={wf.id}>
                <CardHeader
                  title={wf.name}
                  subtitle={`${wf.contractType} workflow`}
                  action={wf.isActive ? <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge> : <Badge>Inactive</Badge>}
                />
                <CardContent>
                  <div className="space-y-2">
                    {wf.steps.map((step: any, i: number) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{step.name}</p>
                          <p className="text-xs text-slate-400">
                            {step.approverRole ?? step.approver?.name ?? 'Any approver'}
                          </p>
                        </div>
                        <Badge className={STEP_COLORS[step.type] ?? ''}>{step.type.replace(/_/g, ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-400 py-8">
              No workflows configured. Create one via the API or seed data.
            </p>
            <Button onClick={() => initWorkflow.mutate('ctr-2')} className="mx-auto block">
              Test workflow on sample contract
            </Button>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}