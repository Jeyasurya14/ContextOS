'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, AlertCircle, Loader2, Github, Zap } from 'lucide-react'

/* ─── Logo ───────────────────────────────────────────────────── */
function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14C16 14 10 21 10 32s6 18 18 18"
        stroke="url(#g1)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="url(#g1)" />
      <path d="M37 18l13 7.5V39L37 46.5 24 39V25.5z"
        stroke="url(#g1)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="30" y1="28" x2="44" y2="28" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="32" x2="44" y2="32" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="36" x2="44" y2="36" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Stat row ───────────────────────────────────────────────── */
function StatRow({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(148,148,176,0.7)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

/* ─── Login Page ─────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()
  const { token, setToken, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused]  = useState(false)

  useEffect(() => { if (token) router.replace('/') }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: tokens } = await authApi.login(email, password)
      setToken(tokens.access_token)
      if (tokens.user) setUser(tokens.user)
      else { const { data: user } = await authApi.getMe(); setUser(user) }
      await new Promise(r => setTimeout(r, 80))
      window.location.href = '/'
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail || 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: 'clamp(340px, 38vw, 480px)',
          flexShrink: 0,
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-subtle)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Subtle gradient wash */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 30% 70%, rgba(245,158,11,0.06) 0%, transparent 100%)',
        }} />
        {/* Top-right accent */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: '36px 40px' }}>
          {/* Logo + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size={26} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              ContextOS
            </span>
          </div>

          {/* Main marketing copy — vertically centered */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 48px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 'var(--r-full)',
              background: 'var(--brand-muted)', border: '1px solid var(--brand-border)',
              marginBottom: 20, alignSelf: 'flex-start',
            }}>
              <Zap style={{ width: 11, height: 11, color: 'var(--brand)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-text)', letterSpacing: '0.02em' }}>
                AI-powered context layer
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(26px, 3vw, 34px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.035em',
              lineHeight: 1.18,
              marginBottom: 14,
            }}>
              Your entire workspace,<br />
              <span style={{ color: 'var(--brand-text)' }}>searchable instantly.</span>
            </h1>

            <p style={{
              fontSize: 14, lineHeight: 1.65,
              color: 'var(--text-tertiary)',
              maxWidth: 320,
            }}>
              Connect GitHub, Notion, Slack, and more. Ask your AI anything about your codebase and team knowledge.
            </p>

            {/* Stats */}
            <div style={{
              display: 'flex', gap: 32, marginTop: 36,
              paddingTop: 28, borderTop: '1px solid var(--border-subtle)',
            }}>
              <StatRow value="50k+" label="Context chunks indexed" />
              <StatRow value="12+"  label="Integrations available" />
              <StatRow value="99.9%" label="Uptime" />
            </div>
          </div>

          {/* Testimonial */}
          <div style={{
            padding: '18px 20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-lg)',
          }}>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)', marginBottom: 14 }}>
              "ContextOS cut our onboarding time by 60%. New engineers can ask about any part of the codebase on day one."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>A</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>Alex Chen</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>CTO at Finexo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL ═══════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div
          className="anim-fade-up"
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Mobile logo */}
          <div
            className="flex lg:hidden"
            style={{ alignItems: 'center', gap: 9, justifyContent: 'center', marginBottom: 40 }}
          >
            <Logo size={24} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              ContextOS
            </span>
          </div>

          {/* Form header */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 8,
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', lineHeight: 1 }}>
              New to ContextOS?{' '}
              <Link href="/register" style={{ color: 'var(--brand-text)', fontWeight: 500, textDecoration: 'none' }}>
                Create a free account
              </Link>
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            borderRadius: 'var(--r-xl)',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}>
            {/* Error banner */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                padding: '10px 12px', marginBottom: 18,
                background: 'var(--danger-muted)', border: '1px solid var(--danger-border)',
                borderRadius: 'var(--r-md)',
              }}
                className="anim-fade-in"
              >
                <AlertCircle style={{ width: 15, height: 15, color: 'var(--danger-text)', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: 'var(--danger-text)', lineHeight: 1.45 }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Email */}
              <div className="field-group">
                <label className="field-label">Email address</label>
                <div className="field-wrapper">
                  <input
                    className="field-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="field-label">Password</label>
                  <Link href="/forgot-password" style={{
                    fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none',
                    transition: 'color var(--t-fast)',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="field-wrapper">
                  <input
                    className={`field-input icon-right`}
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="field-icon right btn"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                    style={{
                      background: 'none', border: 'none', borderRadius: 'var(--r-sm)',
                      padding: '4px', height: 28, width: 28,
                    }}
                  >
                    {showPass
                      ? <EyeOff style={{ width: 15, height: 15, color: 'var(--text-tertiary)' }} />
                      : <Eye    style={{ width: 15, height: 15, color: 'var(--text-tertiary)' }} />
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg btn-full"
                style={{ marginTop: 4 }}
              >
                {loading
                  ? <Loader2 className="anim-spin" style={{ width: 16, height: 16 }} />
                  : 'Sign in to ContextOS'
                }
              </button>
            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            By signing in you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
