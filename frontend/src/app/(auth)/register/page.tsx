// frontend/src/app/(auth)/register/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, AlertCircle, Loader2, Check } from 'lucide-react'

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="rc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50"
        fill="none" stroke="url(#rc)" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="#f59e0b" />
      <g transform="translate(37,32)">
        <path d="M0,-14 L12,-7 L12,7 L0,14 L-12,7 L-12,-7 Z"
          fill="none" stroke="url(#rc)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-6" y1="-3.5" x2="6" y2="-3.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="-6" y1="0"    x2="6" y2="0"    stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="-6" y1="3.5"  x2="6" y2="3.5"  stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const checks = [
    { label: 'At least 8 characters',   pass: password.length >= 8 },
    { label: 'One uppercase letter',     pass: /[A-Z]/.test(password) },
    { label: 'One number or symbol',     pass: /[0-9!@#$%^&*]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length
  const colors = ['#ef4444', '#f59e0b', '#22c55e']
  const labels = ['Weak', 'Fair', 'Strong']

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i < score ? colors[score - 1] : '#1e1e2e',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.pass ? 'rgba(34,197,94,0.12)' : '#1a1a24',
              border: `1px solid ${c.pass ? 'rgba(34,197,94,0.3)' : '#252535'}`,
              transition: 'all 0.2s',
            }}>
              {c.pass && <Check style={{ width: 8, height: 8, color: '#22c55e' }} />}
            </div>
            <span style={{ fontSize: 11, color: c.pass ? '#4ade80' : '#4a4a60' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { token, setToken, setUser } = useAuthStore()
  const [fullName, setFullName] = useState('')
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
      const { data: tokens } = await authApi.register(email, fullName, password)
      setToken(tokens.access_token)
      const { data: user } = await authApi.getMe()
      setUser(user)
      await new Promise(r => setTimeout(r, 100))
      window.location.href = '/'
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { detail?: string } } }
        setError(e.response?.data?.detail || 'Registration failed. Please try again.')
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
      {/* ── Left: Branding ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <Logo size={28} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e8e8f0', letterSpacing: '-0.01em' }}>
            ContextOS
          </span>
        </div>

        <div style={{ paddingBottom: 80 }}>
          <p style={{
            fontSize: 24, fontWeight: 700, color: '#e8e8f0',
            letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 12,
          }}>
            Start free.<br />Scale when ready.
          </p>
          <p style={{ fontSize: 13, color: '#4a4a60', lineHeight: 1.7, marginBottom: 32 }}>
            Everything you need to give your AI the full picture of your workspace — without the complexity.
          </p>

          {/* Feature checklist */}
          {[
            'Free forever on the Starter plan',
            'Connect GitHub, Notion, Slack & Linear',
            'VS Code extension included',
            'No credit card required',
          ].map(item => (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Check style={{ width: 9, height: 9, color: '#f59e0b' }} />
              </div>
              <span style={{ fontSize: 13, color: '#8888a0' }}>{item}</span>
            </div>
          ))}
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
            alignItems: 'center', gap: 8, marginBottom: 32, justifyContent: 'center',
          }}>
            <Logo size={24} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f0' }}>ContextOS</span>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 700, color: '#e8e8f0',
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: '#4a4a60', marginBottom: 28 }}>
            Already have one?{' '}
            <Link href="/login" style={{ color: '#f59e0b', fontWeight: 500 }}>
              Sign in
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Full name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#8888a0', marginBottom: 6 }}>
                Full name
              </label>
              <input
                className="input"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                autoComplete="name"
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#8888a0', marginBottom: 6 }}>
                Work email
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#8888a0', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              <PasswordStrength password={password} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: 40, marginTop: 6, fontSize: 14 }}
            >
              {loading
                ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 0.75s linear infinite' }} />
                : 'Create account'
              }
            </button>
          </form>

          <p style={{ fontSize: 12, color: '#4a4a60', textAlign: 'center', marginTop: 24 }}>
            By signing up you agree to our{' '}
            <Link href="/terms" style={{ color: '#8888a0' }}>Terms</Link>
            {' '}&amp;{' '}
            <Link href="/privacy" style={{ color: '#8888a0' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
