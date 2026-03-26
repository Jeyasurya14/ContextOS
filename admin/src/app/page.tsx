'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Invalid credentials')
      }

      const data = await response.json()
      
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/me`, {
        headers: { 
          'Authorization': `Bearer ${data.access_token}`,
        },
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to verify admin status')
      }

      const profile = await profileResponse.json()
      
      if (!profile.is_admin) {
        throw new Error('Access denied. Admin privileges required.')
      }

      localStorage.setItem('admin_token', data.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-dark-950 p-4">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/5 rounded-full blur-3xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand to-brand-dark rounded-2xl mb-4 shadow-lg shadow-brand/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            ContextOS
            <span className="block text-xl font-medium text-brand mt-1">Admin Portal</span>
          </h1>
          <p className="text-dark-400 text-sm">Secure access to your admin dashboard</p>
        </div>

        {/* Login Card */}
        <div className="card shadow-2xl border-dark-700/50 backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-dark-200">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 group-focus-within:text-brand transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11 h-12 text-base focus:border-brand focus:shadow-lg focus:shadow-brand/10"
                  placeholder="admin@contextos.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-dark-200">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 group-focus-within:text-brand transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-11 pr-11 h-12 text-base focus:border-brand focus:shadow-lg focus:shadow-brand/10"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-brand transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-danger text-sm font-medium">Authentication Failed</p>
                  <p className="text-danger/80 text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-12 text-base font-semibold flex items-center justify-center gap-2 mt-6 shadow-xl shadow-brand/20 hover:shadow-2xl hover:shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Sign In Securely
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-dark-500 text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Admin access only • Unauthorized access is prohibited</span>
          </div>
          <p className="text-dark-600 text-xs">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  )
}
