// frontend/src/app/(auth)/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="lc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50"
        fill="none" stroke="url(#lc)" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="#f59e0b" />
      <g transform="translate(37,32)">
        <path d="M0,-14 L12,-7 L12,7 L0,14 L-12,7 L-12,-7 Z"
          fill="none" stroke="url(#lc)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-6" y1="-3.5" x2="6" y2="-3.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="-6" y1="0"    x2="6" y2="0"    stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="-6" y1="3.5"  x2="6" y2="3.5"  stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { token, setToken, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { if (token) router.replace('/') }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: tokens } = await authApi.login(email, password)
      setToken(tokens.access_token)
      if (tokens.user) {
        setUser(tokens.user)
      } else {
        const { data: user } = await authApi.getMe()
        setUser(user)
      }
      await new Promise(r => setTimeout(r, 100))
      window.location.href = '/'
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { detail?: string } } }
        setError(e.response?.data?.detail || 'Invalid email or password')
      } else {
        setError('Cannot reach the server. Check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0a0a0f',
    }}>
      {/* ── Left: Branding panel ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: 400,
          flexShrink: 0,
          background: '#0d0d15',
          borderRight: '1px solid #1e1e2e',
          flexDirection: 'column',
          padding: '40px 40px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <Logo size={28} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e8e8f0', letterSpacing: '-0.01em' }}>
            ContextOS
          </span>
        </div>

        {/* Center content */}
        <div style={{ paddingBottom: 80 }}>
          <p style={{
            fontSize: 24, fontWeight: 700, color: '#e8e8f0',
            letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 12,
          }}>
            Your entire workspace,<br />queryable in seconds.
          </p>
          <p style={{ fontSize: 13, color: '#4a4a60', lineHeight: 1.7, marginBottom: 40 }}>
            Connect GitHub, Notion, Slack and more. Ask anything about your codebase or team knowledge.
          </p>

          {/* Testimonial */}
          <div style={{
            padding: '16px 20px',
            background: '#111118',
            border: '1px solid #1e1e2e',
            borderRadius: 12,
          }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10, color: '#8888a0' }}>
              &ldquo;ContextOS cut our onboarding time in half. New devs can ask about any part of the codebase immediately.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #d97706, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>A</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f0', margin: 0 }}>Alex Chen</p>
                <p style={{ fontSize: 11, color: '#4a4a60', margin: 0 }}>CTO, Finexo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div
          className="animate-fade-in"
          style={{ width: '100%', maxWidth: 380 }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden" style={{
            alignItems: 'center', gap: 8, marginBottom: 32,
            justifyContent: 'center',
          }}>
            <Logo size={24} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f0' }}>ContextOS</span>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 700, color: '#e8e8f0',
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            Sign in
          </h1>
          <p style={{ fontSize: 13, color: '#4a4a60', marginBottom: 28 }}>
            New here?{' '}
            <Link href="/register" style={{ color: '#f59e0b', fontWeight: 500 }}>
              Create a free account
            </Link>
          </p>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 14px', marginBottom: 20, borderRadius: 10,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 500,
                color: '#8888a0', marginBottom: 6,
              }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 500,
                color: '#8888a0', marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#4a4a60', display: 'flex', padding: 0,
                  }}
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 15, height: 15 }} />
                    : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: 40, marginTop: 4, fontSize: 14 }}
            >
              {loading
                ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 0.75s linear infinite' }} />
                : 'Sign in'
              }
            </button>
          </form>

          <p style={{ fontSize: 12, color: '#4a4a60', textAlign: 'center', marginTop: 24 }}>
            By signing in you agree to our{' '}
            <Link href="/terms" style={{ color: '#8888a0' }}>Terms</Link>
            {' '}&amp;{' '}
            <Link href="/privacy" style={{ color: '#8888a0' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
