'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, AlertCircle, Loader2, Check, Zap } from 'lucide-react'

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="rg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14C16 14 10 21 10 32s6 18 18 18" stroke="url(#rg1)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="url(#rg1)" />
      <path d="M37 18l13 7.5V39L37 46.5 24 39V25.5z" stroke="url(#rg1)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="30" y1="28" x2="44" y2="28" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="32" x2="44" y2="32" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="36" x2="44" y2="36" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Password strength ───────────────────────────────────────── */
const RULES = [
  { label: '8+ characters',       test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter',    test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number or symbol',    test: (p: string) => /[0-9\W]/.test(p) },
]

function PasswordMeter({ password }: { password: string }) {
  if (!password) return null
  const score = RULES.filter(r => r.test(password)).length
  const barColor = score === 1 ? '#ef4444' : score === 2 ? '#f59e0b' : '#10b981'

  return (
    <div style={{ marginTop: 8 }}>
      {/* Bars */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {RULES.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i < score ? barColor : 'var(--bg-overlay)',
            transition: 'background 0.25s',
          }} />
        ))}
      </div>
      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {RULES.map(rule => {
          const pass = rule.test(password)
          return (
            <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: pass ? 'var(--success-muted)' : 'var(--bg-overlay)',
                border: `1px solid ${pass ? 'var(--success-border)' : 'var(--border-base)'}`,
                transition: 'all 0.2s',
              }}>
                {pass && <Check style={{ width: 9, height: 9, color: 'var(--success-text)' }} />}
              </div>
              <span style={{ fontSize: 12, color: pass ? 'var(--success-text)' : 'var(--text-tertiary)' }}>
                {rule.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Feature item ────────────────────────────────────────────── */
function Feature({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'var(--brand-muted)', border: '1px solid var(--brand-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Check style={{ width: 10, height: 10, color: 'var(--brand)' }} />
      </div>
      <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const router = useRouter()
  const { token, setToken, setUser } = useAuthStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

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
      await new Promise(r => setTimeout(r, 80))
      window.location.href = '/'
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: 'clamp(320px, 36vw, 460px)',
          flexShrink: 0,
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-subtle)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Gradient wash */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 20% 80%, rgba(245,158,11,0.055) 0%, transparent 100%)',
        }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: '36px 40px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size={26} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              ContextOS
            </span>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 40px' }}>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 'var(--r-full)',
              background: 'var(--brand-muted)', border: '1px solid var(--brand-border)',
              marginBottom: 20, alignSelf: 'flex-start',
            }}>
              <Zap style={{ width: 11, height: 11, color: 'var(--brand)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-text)', letterSpacing: '0.02em' }}>
                Start for free
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(24px, 2.8vw, 32px)',
              fontWeight: 800, color: 'var(--text-primary)',
              letterSpacing: '-0.035em', lineHeight: 1.2,
              marginBottom: 12,
            }}>
              Context for your<br />
              <span style={{ color: 'var(--brand-text)' }}>entire team.</span>
            </h1>

            <p style={{
              fontSize: 14, lineHeight: 1.65, color: 'var(--text-tertiary)',
              maxWidth: 300, marginBottom: 32,
            }}>
              Everything you need to give your AI the full picture of your codebase and team — without the complexity.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Feature label="Free forever on the Starter plan" />
              <Feature label="GitHub, Notion, Slack, Linear & more" />
              <Feature label="VS Code extension included" />
              <Feature label="No credit card required" />
            </div>
          </div>

          {/* Trust bar */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-lg)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ display: 'flex' }}>
              {['#7c3aed','#db2777','#0891b2','#059669'].map((c, i) => (
                <div key={c} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${c}, ${c}dd)`,
                  border: '2px solid var(--bg-surface)',
                  marginLeft: i === 0 ? 0 : -6, position: 'relative', zIndex: 4 - i,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                }}>
                  {['A','B','C','D'][i]}
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
                1,200+ teams onboarded
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                Join developers who ship faster with context
              </p>
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
        overflowY: 'auto',
      }}>
        <div
          className="anim-fade-up"
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Mobile logo */}
          <div
            className="flex lg:hidden"
            style={{ alignItems: 'center', gap: 9, justifyContent: 'center', marginBottom: 36 }}
          >
            <Logo size={24} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              ContextOS
            </span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.025em', marginBottom: 8,
            }}>
              Create your account
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--brand-text)', fontWeight: 500, textDecoration: 'none' }}>
                Sign in
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
            {error && (
              <div
                className="anim-fade-in"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  padding: '10px 12px', marginBottom: 16,
                  background: 'var(--danger-muted)', border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <AlertCircle style={{ width: 15, height: 15, color: 'var(--danger-text)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: 'var(--danger-text)', lineHeight: 1.45 }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div className="field-group">
                <label className="field-label">Full name</label>
                <input
                  className="field-input"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  autoComplete="name"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div className="field-group">
                <label className="field-label">Work email</label>
                <input
                  className="field-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="field-group">
                <label className="field-label">Password</label>
                <div className="field-wrapper">
                  <input
                    className="field-input icon-right"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
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
                <PasswordMeter password={password} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg btn-full"
                style={{ marginTop: 4 }}
              >
                {loading
                  ? <Loader2 className="anim-spin" style={{ width: 16, height: 16 }} />
                  : 'Create free account'
                }
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
