'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Input, Button, Spinner } from '@/components/ui/common';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'ECONNABORTED') {
        toast.error(
          'The server took too long to respond. It may still be starting up — please try again.',
        );
      } else {
        toast.error(err?.response?.data?.message ?? 'Login failed');
      }
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
            <h1 className="text-xl font-bold text-slate-900">Contract OS</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="admin@acme.com"
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
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4 border-indigo-200 border-t-indigo-600" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
            {loading && (
              <p className="animate-pulse text-center text-xs text-slate-400">
                Free server may be waking up — the first request can take up to a
                minute.
              </p>
            )}
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Demo: admin@acme.com / Password@123
          </p>

          <p className="mt-6 text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-indigo-600 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}