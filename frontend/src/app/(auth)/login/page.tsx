// frontend/src/app/(auth)/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="40" height="40">
      <defs>
        <linearGradient id="lc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="lh" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50"
        fill="none" stroke="url(#lc)" strokeWidth="5.5" strokeLinecap="round" filter="url(#glow)" />
      <circle cx="17" cy="32" r="4" fill="#f59e0b" filter="url(#glow)" />
      <g transform="translate(37,32)" filter="url(#glow)">
        <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z"
          fill="none" stroke="url(#lh)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#lh)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="0"  x2="7" y2="0"  stroke="url(#lh)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="4"  x2="7" y2="4"  stroke="url(#lh)" strokeWidth="2" strokeLinecap="round" />
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
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    if (token) router.replace('/')
  }, [token, router])

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
      await new Promise(resolve => setTimeout(resolve, 100))
      window.location.href = '/'
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setError(axiosErr.response?.data?.detail || 'Login failed')
      } else {
        setError('Connection error. Is the server running?')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', position: 'relative',
      overflow: 'hidden', background: 'rgb(8,8,18)',
    }}>
      <style>{`
        @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes blob { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes borderGlow { 0%,100%{box-shadow:0 0 0 1px rgba(245,158,11,0.15),0 0 20px rgba(245,158,11,0.06)} 50%{box-shadow:0 0 0 1px rgba(245,158,11,0.35),0 0 40px rgba(245,158,11,0.12)} }
        .form-card { animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .feature-badge { animation: fadeIn 1s ease-out both; }
      `}</style>

      {/* ── Animated background blobs ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-8%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 65%)',
          borderRadius: '50%', filter: 'blur(60px)',
          animation: 'glowPulse 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 65%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'glowPulse 11s ease-in-out infinite',
          animationDelay: '3s',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '40%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(60px)',
          animation: 'glowPulse 14s ease-in-out infinite',
          animationDelay: '6s',
        }} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      {/* ── Left decorative panel (desktop) ── */}
      <div className="hidden lg:flex" style={{
        width: '42%', position: 'relative', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: '60px',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 340, animation: 'fadeIn 1s ease-out' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 99,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.18)',
            marginBottom: 32,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              AI-Powered Developer Tool
            </span>
          </div>

          <h2 style={{
            fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.15,
            letterSpacing: '-0.02em', marginBottom: 16,
            fontFamily: 'Inter, sans-serif',
          }}>
            Your codebase,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>understood</span>.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(160,160,190,0.85)', lineHeight: 1.7, marginBottom: 40 }}>
            ContextOS connects your GitHub, Notion, Slack, and more — giving your AI assistant full awareness of your entire workflow.
          </p>

          {/* Feature list */}
          {[
            { emoji: '⚡', title: 'Instant Context', desc: 'Sync thousands of chunks in seconds' },
            { emoji: '🔗', title: 'Multi-source', desc: 'GitHub, Notion, Slack, Linear & more' },
            { emoji: '🤖', title: 'AI-ready', desc: 'Perfect for VS Code extension & API use' },
          ].map((f, i) => (
            <div key={f.title} className="feature-badge" style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20,
              animationDelay: `${0.3 + i * 0.15}s`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>{f.emoji}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(230,230,250,0.9)', marginBottom: 2 }}>{f.title}</p>
                <p style={{ fontSize: 12, color: 'rgba(130,130,160,0.8)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div className="form-card" style={{ width: '100%', maxWidth: 420 }}>

          {/* Brand header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.1))',
              border: '1px solid rgba(245,158,11,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
              animation: 'borderGlow 4s ease-in-out infinite',
            }}>
              <Logo />
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6,
              fontFamily: 'Inter, sans-serif',
            }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: 'rgba(130,130,165,0.9)' }}>Sign in to your ContextOS account</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 20, padding: '12px 16px', borderRadius: 14,
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.22)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#fb7185', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fb7185', margin: 0 }}>Authentication failed</p>
                <p style={{ fontSize: 12, color: 'rgba(251,113,133,0.75)', margin: '3px 0 0' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Form card */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(18,18,32,0.95), rgba(12,12,22,0.9))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: 28,
            backdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(200,200,225,0.8)', marginBottom: 8, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16,
                    color: focusedField === 'email' ? '#f59e0b' : 'rgba(130,130,160,0.6)',
                    transition: 'color 0.2s',
                  }} />
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px',
                      background: 'rgba(8,8,18,0.7)',
                      border: `1px solid ${focusedField === 'email' ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}`,
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(200,200,225,0.8)', marginBottom: 8, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16,
                    color: focusedField === 'password' ? '#f59e0b' : 'rgba(130,130,160,0.6)',
                    transition: 'color 0.2s',
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%', padding: '12px 48px 12px 42px',
                      background: 'rgba(8,8,18,0.7)',
                      border: `1px solid ${focusedField === 'password' ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
                      boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(245,158,11,0.08)' : 'none',
                      transition: 'all 0.2s',
                    }}
                    placeholder="••••••••••"
                    required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'rgba(130,130,160,0.6)', background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'color 0.2s', padding: 0, display: 'flex',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(130,130,160,0.6)')}>
                    {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6,
                  width: '100%', height: 48,
                  background: loading ? 'rgba(100,100,130,0.3)' : 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 14, color: '#fff',
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  transform: 'translateY(0)',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                {loading ? (
                  <><Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />Signing in…</>
                ) : (
                  <><LogIn style={{ width: 16, height: 16 }} />Sign In</>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'rgba(120,120,150,0.8)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{
              color: '#fbbf24', fontWeight: 600, textDecoration: 'none',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
              onMouseLeave={e => (e.currentTarget.style.color = '#fbbf24')}>
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
