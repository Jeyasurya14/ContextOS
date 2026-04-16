// frontend/src/app/(auth)/register/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { UserPlus, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, User, CheckCircle } from 'lucide-react'

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="40" height="40">
      <defs>
        <linearGradient id="rc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="rh" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="rglow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50"
        fill="none" stroke="url(#rc)" strokeWidth="5.5" strokeLinecap="round" filter="url(#rglow)" />
      <circle cx="17" cy="32" r="4" fill="#f59e0b" filter="url(#rglow)" />
      <g transform="translate(37,32)" filter="url(#rglow)">
        <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z"
          fill="none" stroke="url(#rh)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#rh)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="0"  x2="7" y2="0"  stroke="url(#rh)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="4"  x2="7" y2="4"  stroke="url(#rh)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

const PERKS = [
  'Free forever on the Starter plan',
  'Connect GitHub, Notion, Slack & more',
  'VS Code extension included',
  'AI context search across all sources',
]

export default function RegisterPage() {
  const router = useRouter()
  const { token, setToken, setUser } = useAuthStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)

  useEffect(() => {
    if (token) router.replace('/')
  }, [token, router])

  useEffect(() => {
    const s = password.length
    let strength = 0
    if (s >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    setPasswordStrength(strength)
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: tokens } = await authApi.register(email, fullName, password)
      setToken(tokens.access_token)
      const { data: user } = await authApi.getMe()
      setUser(user)
      await new Promise(resolve => setTimeout(resolve, 100))
      window.location.href = '/'
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setError(axiosErr.response?.data?.detail || 'Registration failed')
      } else {
        setError('Connection error. Is the server running?')
      }
    } finally {
      setLoading(false)
    }
  }

  const strengthColors = ['#f43f5e', '#f59e0b', '#06b6d4', '#10b981']
  const strengthLabels = ['Too short', 'Weak', 'Good', 'Strong']

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', position: 'relative',
      overflow: 'hidden', background: 'rgb(8,8,18)',
    }}>
      <style>{`
        @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes borderGlow { 0%,100%{box-shadow:0 0 0 1px rgba(245,158,11,0.15),0 0 20px rgba(245,158,11,0.06)} 50%{box-shadow:0 0 0 1px rgba(245,158,11,0.35),0 0 40px rgba(245,158,11,0.12)} }
        .form-card { animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-8%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)',
          borderRadius: '50%', filter: 'blur(60px)',
          animation: 'glowPulse 9s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-8%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 65%)',
          borderRadius: '50%', filter: 'blur(70px)',
          animation: 'glowPulse 12s ease-in-out infinite',
          animationDelay: '4s',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      {/* ── Form panel ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div className="form-card" style={{ width: '100%', maxWidth: 440 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(245,158,11,0.1))',
              border: '1px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
              animation: 'borderGlow 4s ease-in-out infinite',
            }}>
              <Logo />
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 800, color: '#fff',
              letterSpacing: '-0.02em', marginBottom: 6,
              fontFamily: 'Inter, sans-serif',
            }}>Create your account</h1>
            <p style={{ fontSize: 14, color: 'rgba(130,130,165,0.9)' }}>
              Start for free — no credit card required
            </p>
          </div>

          {/* Perks row */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px 16px',
            marginBottom: 22, justifyContent: 'center',
          }}>
            {PERKS.map(p => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, color: 'rgba(160,160,190,0.8)',
              }}>
                <CheckCircle style={{ width: 12, height: 12, color: '#10b981', flexShrink: 0 }} />
                {p}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 18, padding: '12px 16px', borderRadius: 14,
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.22)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#fb7185', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fb7185', margin: 0 }}>Registration failed</p>
                <p style={{ fontSize: 12, color: 'rgba(251,113,133,0.75)', margin: '3px 0 0' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Form card */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(18,18,32,0.95), rgba(12,12,22,0.9))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: 28,
            backdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Full name */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(190,190,220,0.7)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15,
                    color: focusedField === 'name' ? '#8b5cf6' : 'rgba(130,130,160,0.5)',
                    transition: 'color 0.2s',
                  }} />
                  <input
                    type="text" value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%', padding: '11px 14px 11px 40px',
                      background: 'rgba(8,8,18,0.7)',
                      border: `1px solid ${focusedField === 'name' ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
                      boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(139,92,246,0.08)' : 'none',
                      transition: 'all 0.2s',
                    }}
                    placeholder="Jane Doe"
                    required autoComplete="name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(190,190,220,0.7)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15,
                    color: focusedField === 'email' ? '#f59e0b' : 'rgba(130,130,160,0.5)',
                    transition: 'color 0.2s',
                  }} />
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%', padding: '11px 14px 11px 40px',
                      background: 'rgba(8,8,18,0.7)',
                      border: `1px solid ${focusedField === 'email' ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
                      boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(245,158,11,0.08)' : 'none',
                      transition: 'all 0.2s',
                    }}
                    placeholder="you@example.com"
                    required autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(190,190,220,0.7)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15,
                    color: focusedField === 'password' ? '#06b6d4' : 'rgba(130,130,160,0.5)',
                    transition: 'color 0.2s',
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%', padding: '11px 46px 11px 40px',
                      background: 'rgba(8,8,18,0.7)',
                      border: `1px solid ${focusedField === 'password' ? 'rgba(6,182,212,0.45)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
                      boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(6,182,212,0.08)' : 'none',
                      transition: 'all 0.2s',
                    }}
                    placeholder="Min 8 characters"
                    required minLength={8} autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'rgba(130,130,160,0.5)', background: 'none', border: 'none',
                    cursor: 'pointer', transition: 'color 0.2s', padding: 0, display: 'flex',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#06b6d4')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(130,130,160,0.5)')}>
                    {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                </div>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 99,
                          background: i < passwordStrength ? strengthColors[passwordStrength - 1] : 'rgba(255,255,255,0.07)',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: passwordStrength > 0 ? strengthColors[passwordStrength - 1] : 'rgba(130,130,160,0.5)' }}>
                      {password.length > 0 ? strengthLabels[Math.max(passwordStrength - 1, 0)] : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6,
                  width: '100%', height: 48,
                  background: loading
                    ? 'rgba(100,100,130,0.3)'
                    : 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 14, color: '#fff',
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 20px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                {loading ? (
                  <><Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />Creating account…</>
                ) : (
                  <><UserPlus style={{ width: 16, height: 16 }} />Create Free Account</>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(120,120,150,0.8)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b5cf6')}
              onMouseLeave={e => (e.currentTarget.style.color = '#a78bfa')}>
              Sign in →
            </Link>
          </p>

          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'rgba(100,100,130,0.6)' }}>
            By signing up you agree to our{' '}
            <Link href="/terms" style={{ color: 'rgba(160,160,190,0.7)', textDecoration: 'underline' }}>Terms</Link>
            {' '}&amp;{' '}
            <Link href="/privacy" style={{ color: 'rgba(160,160,190,0.7)', textDecoration: 'underline' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>

      {/* ── Right decorative panel (desktop) ── */}
      <div className="hidden lg:flex" style={{
        width: '38%', position: 'relative',
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '60px', borderLeft: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 300, animation: 'fadeIn 1s ease-out 0.3s both' }}>
          <div style={{
            padding: '28px',
            background: 'linear-gradient(145deg, rgba(18,18,32,0.9), rgba(12,12,22,0.85))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            boxShadow: '0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.08))',
                border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Logo />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>ContextOS</p>
                <p style={{ fontSize: 10, color: '#10b981', margin: 0, fontWeight: 600 }}>● LIVE</p>
              </div>
              <div style={{
                marginLeft: 'auto', padding: '3px 10px', borderRadius: 99,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                fontSize: 10, fontWeight: 700, color: '#fbbf24',
              }}>FREE</div>
            </div>
            {[
              { label: 'Context chunks', value: '12,481', color: '#f59e0b' },
              { label: 'Active sources', value: '4 / 5',  color: '#10b981' },
              { label: 'Queries today',  value: '38',     color: '#8b5cf6' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: 12, color: 'rgba(150,150,180,0.8)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <CheckCircle style={{ width: 14, height: 14, color: '#10b981', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: 'rgba(160,220,195,0.85)', margin: 0 }}>
                All systems operational
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
