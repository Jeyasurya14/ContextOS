'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { ToastProvider } from '@/components/ui/Toast'
import {
  LayoutDashboard, MessageSquare, Plug, FolderOpen,
  Users, CreditCard, Settings, LogOut, ChevronRight, Menu, X, Zap,
} from 'lucide-react'
import Link from 'next/link'
import '@/globals.css'

const NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/chat',         icon: MessageSquare,   label: 'Chat' },
  { href: '/dashboard/integrations', icon: Plug,            label: 'Integrations' },
  { href: '/dashboard/projects',     icon: FolderOpen,      label: 'Projects' },
  { href: '/dashboard/team',         icon: Users,           label: 'Team' },
]

const NAV_SECONDARY = [
  { href: '/dashboard/billing',  icon: CreditCard, label: 'Billing' },
  { href: '/dashboard/settings', icon: Settings,   label: 'Settings' },
]

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50"
        fill="none" stroke="url(#lg)" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="#f59e0b" />
      <g transform="translate(37,32)">
        <path d="M0,-14 L12,-7 L12,7 L0,14 L-12,7 L-12,-7 Z"
          fill="none" stroke="url(#lg)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-6" y1="-3.5" x2="6" y2="-3.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="-6" y1="0"    x2="6" y2="0"    stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="-6" y1="3.5"  x2="6" y2="3.5"  stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function NavItem({ href, icon: Icon, label, isActive, onClick }: {
  href: string; icon: any; label: string; isActive: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} onClick={onClick}>
      <div className={`nav-link ${isActive ? 'active' : ''}`}>
        <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
        <span>{label}</span>
      </div>
    </Link>
  )
}

function Sidebar({ user, pathname, onNavClick, onLogout }: {
  user: any; pathname: string | null; onNavClick?: () => void; onLogout: () => void
}) {
  const plan = (user?.plan ?? 'free').toLowerCase()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '0 12px',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '16px 8px 14px',
        borderBottom: '1px solid #1e1e2e',
        marginBottom: 8,
      }}>
        <Logo size={22} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f0', letterSpacing: '-0.01em' }}>
          ContextOS
        </span>
      </div>

      {/* Primary nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 4 }}>
        {NAV.map(item => (
          <NavItem
            key={item.href}
            {...item}
            isActive={item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname?.startsWith(item.href) ?? false
            }
            onClick={onNavClick}
          />
        ))}

        {/* Divider */}
        <div style={{ height: 1, background: '#1e1e2e', margin: '8px 2px' }} />

        {NAV_SECONDARY.map(item => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname?.startsWith(item.href) ?? false}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        borderTop: '1px solid #1e1e2e',
        padding: '10px 0 12px',
      }}>
        {/* Plan badge */}
        {plan === 'free' && (
          <Link href="/dashboard/billing">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 10px', borderRadius: 8, marginBottom: 4,
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.14)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.06)')}
            >
              <Zap style={{ width: 12, height: 12, color: '#f59e0b' }} />
              <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500, flex: 1 }}>Free plan</span>
              <span style={{ fontSize: 11, color: '#8888a0' }}>Upgrade →</span>
            </div>
          </Link>
        )}

        {/* User row */}
        <Link href="/dashboard/settings" onClick={onNavClick}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#111118')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #d97706, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? '—'}
              </p>
              <p style={{ fontSize: 11, color: '#4a4a60', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ?? ''}
              </p>
            </div>
            <ChevronRight style={{ width: 13, height: 13, color: '#4a4a60', flexShrink: 0 }} />
          </div>
        </Link>

        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 10px', borderRadius: 8, marginTop: 2,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#4a4a60', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = '#4a4a60'
          }}
        >
          <LogOut style={{ width: 13, height: 13 }} />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isInitialized, isLoading, initialize, token } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { initialize() }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      const s = useAuthStore.getState()
      if (!s.isInitialized) useAuthStore.setState({ isInitialized: true, isLoading: false })
    }, 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isDashboard = pathname?.startsWith('/dashboard')

  useEffect(() => {
    if (isDashboard && isInitialized && !token) window.location.href = '/login'
  }, [isDashboard, isInitialized, token])

  const handleLogout = () => {
    useAuthStore.getState().logout()
    router.push('/login')
  }

  if (isDashboard && (!isInitialized || (isInitialized && !token))) {
    return (
      <html lang="en" className="dark">
        <body style={{ background: '#0a0a0f', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Logo size={32} />
            <p style={{ fontSize: 13, color: '#4a4a60', marginTop: 12, fontFamily: 'Inter, sans-serif' }}>
              {isInitialized ? 'Redirecting…' : 'Loading…'}
            </p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <ToastProvider>
          {isDashboard ? (
            <div style={{ display: 'flex', height: '100dvh', background: '#0a0a0f', overflow: 'hidden' }}>

              {/* Mobile overlay */}
              {mobileOpen && (
                <div
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 40,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                  }}
                />
              )}

              {/* Sidebar */}
              <aside style={{
                width: 220,
                flexShrink: 0,
                height: '100%',
                background: '#0d0d15',
                borderRight: '1px solid #1e1e2e',
                overflowY: 'auto',
                // Mobile: drawer
                position: 'fixed',
                left: 0, top: 0, bottom: 0,
                zIndex: 50,
                transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.22s ease-out',
              }}
                className="lg:relative lg:translate-x-0 lg:block"
              >
                <style>{`
                  @media (min-width: 1024px) {
                    aside {
                      position: relative !important;
                      transform: none !important;
                      height: 100%;
                    }
                  }
                `}</style>

                {/* Mobile close */}
                <button
                  className="lg:hidden"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 28, height: 28, borderRadius: 6,
                    background: '#1a1a24', border: '1px solid #252535',
                    color: '#8888a0', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1,
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>

                <Sidebar
                  user={user}
                  pathname={pathname}
                  onNavClick={() => setMobileOpen(false)}
                  onLogout={handleLogout}
                />
              </aside>

              {/* Main */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                {/* Mobile topbar */}
                <div
                  className="lg:hidden"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', flexShrink: 0,
                    background: '#0d0d15',
                    borderBottom: '1px solid #1e1e2e',
                  }}
                >
                  <button
                    onClick={() => setMobileOpen(true)}
                    style={{
                      width: 32, height: 32, borderRadius: 7,
                      background: '#111118', border: '1px solid #1e1e2e',
                      color: '#8888a0', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Menu style={{ width: 15, height: 15 }} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Logo size={20} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e8f0' }}>ContextOS</span>
                  </div>
                </div>

                {/* Content */}
                <main style={{ flex: 1, overflow: 'auto' }}>
                  <div style={{ padding: '32px 32px', maxWidth: 1200, margin: '0 auto' }}>
                    {children}
                  </div>
                </main>
              </div>
            </div>
          ) : (
            <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>{children}</div>
          )}
        </ToastProvider>
      </body>
    </html>
  )
}
