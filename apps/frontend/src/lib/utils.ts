import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = 'INR',
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString('en-IN')}`;
  }
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  IN_EXECUTION: 'bg-blue-50 text-blue-700 border-blue-200',
  EXECUTED: 'bg-green-50 text-green-700 border-green-200',
  TERMINATED: 'bg-slate-100 text-slate-500 border-slate-200',
  EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',
  RENEWED: 'bg-teal-50 text-teal-700 border-teal-200',
  ARCHIVED: 'bg-slate-50 text-slate-400 border-slate-100',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-amber-50 text-amber-600',
  CRITICAL: 'bg-red-50 text-red-600',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  LEGAL: 'Legal',
  FINANCE: 'Finance',
  PROCUREMENT: 'Procurement',
  SALES: 'Sales',
  VIEWER: 'Viewer',
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  NDA: 'NDA',
  MSA: 'MSA',
  SOW: 'SOW',
  VENDOR: 'Vendor',
  PURCHASE: 'Purchase',
  SALES: 'Sales',
  LEASE: 'Lease',
  EMPLOYMENT: 'Employment',
  CONSENT: 'Consent',
  AMENDMENT: 'Amendment',
  OTHER: 'Other',
};