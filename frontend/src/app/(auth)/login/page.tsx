// frontend/src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: tokens } = await authApi.login({ email, password });
      setToken(tokens.access_token, tokens.refresh_token);
      const { data: user } = await authApi.me();
      setUser(user);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Login failed');
      } else {
        setError('Connection error. Is the server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-dark-50 mb-2">Welcome back</h1>
          <p className="text-dark-400 text-sm">Sign in to your ContextOS account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 text-sm focus:outline-none focus:border-brand transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 text-sm focus:outline-none focus:border-brand transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white py-2.5 rounded-lg font-medium text-sm hover:bg-brand-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-dark-400 mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-light hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
