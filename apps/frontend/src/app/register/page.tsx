'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Input, Button } from '@/components/ui/common';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              C
            </div>
            <h1 className="text-xl font-bold text-slate-900">Create Account</h1>
            <p className="mt-1 text-sm text-slate-400">Get started with Contract OS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="John Doe"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@company.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="••••••••"
              required
              minLength={4}
            />
            <Input
              label="Organization Name (optional)"
              value={form.orgName}
              onChange={(e) =>
                setForm((f) => ({ ...f, orgName: e.target.value }))
              }
              placeholder="Acme Corp"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}