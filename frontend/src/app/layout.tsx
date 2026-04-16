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
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="lg_nav" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14C16 14 10 21 10 32s6 18 18 18" stroke="url(#lg_nav)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="url(#lg_nav)" />
      <path d="M37 18l13 7.5V39L37 46.5 24 39V25.5z" stroke="url(#lg_nav)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="30" y1="28" x2="44" y2="28" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="32" x2="44" y2="32" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="36" x2="44" y2="36" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function NavItem({ href, icon: Icon, label, isActive, onClick }: {
  href: string; icon: any; label: string; isActive: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} onClick={onClick} style={{ textDecoration: 'none' }}>
      <div className={`nav-item ${isActive ? 'active' : ''}`}>
        <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
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
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 8px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 8,
      }}>
        <Logo size={24} />
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          ContextOS
        </span>
      </div>

      {/* Primary nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 6 }}>
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
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 4px' }} />

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
        borderTop: '1px solid var(--border-subtle)',
        padding: '12px 0 16px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {/* Plan badge */}
        {plan === 'free' && (
          <Link href="/dashboard/billing" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 10px', borderRadius: 'var(--r-md)',
              background: 'var(--brand-muted)',
              border: '1px solid var(--brand-border)',
              cursor: 'pointer',
              transition: 'background var(--t-fast)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-muted)')}
            >
              <Zap style={{ width: 14, height: 14, color: 'var(--brand)' }} />
              <span style={{ fontSize: 13, color: 'var(--brand-text)', fontWeight: 500, flex: 1 }}>Free plan</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Upgrade</span>
            </div>
          </Link>
        )}

        {/* User row */}
        <Link href="/dashboard/settings" onClick={onNavClick} style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer',
            transition: 'background var(--t-fast)',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #d97706, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}>
                {user?.name ?? '—'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}>
                {user?.email ?? ''}
              </p>
            </div>
          </div>
        </Link>
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
        <body style={{ background: 'var(--bg-base)', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }} className="anim-fade-in">
            <Logo size={36} />
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 16, fontWeight: 500 }}>
              {isInitialized ? 'Redirecting…' : 'Loading workspace…'}
            </p>
          </div>
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
            <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg-base)', overflow: 'hidden' }}>

              {/* Mobile overlay */}
              {mobileOpen && (
                <div
                  className="anim-fade-in"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 40,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(3px)',
                  }}
                />
              )}

              {/* Sidebar */}
              <aside style={{
                width: 240,
                flexShrink: 0,
                height: '100%',
                background: 'var(--bg-subtle)',
                borderRight: '1px solid var(--border-subtle)',
                overflowY: 'auto',
                position: 'fixed',
                left: 0, top: 0, bottom: 0,
                zIndex: 50,
                transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s cubic-bezier(.16,1,.3,1)',
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
                  className="lg:hidden btn btn-ghost"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 32, height: 32, padding: 0, zIndex: 1,
                  }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>

                <Sidebar
                  user={user}
                  pathname={pathname}
                  onNavClick={() => setMobileOpen(false)}
                  onLogout={handleLogout}
                />
              </aside>

              {/* Main */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--bg-base)' }}>

                {/* Mobile topbar */}
                <div
                  className="lg:hidden"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', flexShrink: 0,
                    background: 'var(--bg-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    onClick={() => setMobileOpen(true)}
                    style={{ width: 36, height: 36, padding: 0 }}
                  >
                    <Menu style={{ width: 16, height: 16 }} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Logo size={22} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>ContextOS</span>
                  </div>
                </div>

                {/* Content */}
                <main style={{ flex: 1, overflow: 'auto' }}>
                  <div style={{ padding: '36px 40px', maxWidth: 1080, margin: '0 auto' }}>
                    {children}
                  </div>
                </main>
              </div>
            </div>
          ) : (
            <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>{children}</div>
          )}
        </ToastProvider>
      </body>
    </html>
  )
}
