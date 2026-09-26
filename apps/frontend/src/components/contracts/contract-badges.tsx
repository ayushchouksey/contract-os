'use client';

import { Badge } from '@/components/ui/common';
import {
  cn,
  PRIORITY_COLORS,
  STATUS_COLORS,
  CONTRACT_TYPE_LABELS,
} from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn(STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600')}>
      {status?.replace(/_/g, ' ')}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge className={cn(PRIORITY_COLORS[priority] ?? 'bg-slate-100 text-slate-600')}>
      {priority}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
      {CONTRACT_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

export function RiskBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) {
    return <Badge className="bg-slate-100 text-slate-500 border-slate-200">Not analyzed</Badge>;
  }
  const cls =
    score >= 75
      ? 'bg-red-50 text-red-700 border-red-200'
      : score >= 50
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : score >= 25
          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return <Badge className={cls}>{score}/100</Badge>;
}