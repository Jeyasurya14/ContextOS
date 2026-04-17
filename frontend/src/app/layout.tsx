'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { ToastProvider } from '@/components/ui/Toast'
import {
  LayoutDashboard, MessageSquare, Plug, FolderOpen,
  Users, CreditCard, Settings, LogOut, ChevronRight, Menu, X, Zap,
  Globe, Terminal, Activity, Database, Archive, Layers, RefreshCw, BookOpen
} from 'lucide-react'
import Link from 'next/link'
import '@/globals.css'

/* ─── Navigation Definitions ─── */
const NAV_GROUPS = [
  {
    label: 'Intelligence',
    items: [
      { href: '/dashboard',              icon: LayoutDashboard, label: 'Overview' },
      { href: '/dashboard/chat',         icon: MessageSquare,   label: 'Chat' },
      { href: '/dashboard/projects',     icon: FolderOpen,      label: 'Projects' },
    ]
  },
  {
    label: 'Resources',
    items: [
      { href: '/dashboard/integrations', icon: Plug,            label: 'Integrations' },
    ]
  },
  {
    label: 'Management',
    items: [
      { href: '/dashboard/team',         icon: Users,           label: 'Team' },
      { href: '/dashboard/billing',      icon: CreditCard,      label: 'Billing' },
      { href: '/dashboard/settings',     icon: Settings,        label: 'Settings' },
      { href: '/dashboard/guide',        icon: BookOpen,        label: 'Guide' },
    ]
  }
]

/* ─── Components ─── */

function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="lg_render" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14C16 14 10 21 10 32s6 18 18 18" stroke="url(#lg_render)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="url(#lg_render)" />
      <path d="M37 18l13 7.5V39L37 46.5 24 39V25.5z" stroke="url(#lg_render)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

function NavItem({ href, icon: Icon, label, isActive, onClick }: {
  href: string; icon: any; label: string; isActive: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} onClick={onClick} className={`nav-item ${isActive ? 'active' : ''}`}>
      <Icon style={{ width: 16, height: 16, color: isActive ? 'var(--brand)' : 'inherit', strokeWidth: isActive ? 2.5 : 2 }} />
      <span>{label}</span>
    </Link>
  )
}

function Sidebar({ user, pathname, onNavClick }: {
  user: any; pathname: string | null; onNavClick?: () => void
}) {
  const plan = (user?.plan ?? 'free').toLowerCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Workspace Switcher — Render style */}
      <div style={{ padding: '18px 14px 20px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 8,
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer', transition: 'all var(--t-fast)',
        }}
        className="hover:border-[rgba(255,255,255,0.12)] hover:bg-white/[0.02]"
        >
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
            color: '#0a0a0f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em',
            boxShadow: '0 2px 8px rgba(245,158,11,0.25)',
          }}>
            C
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>ContextOS</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, marginTop: 1 }}>Free plan</p>
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-tertiary)', opacity: 0.4 }} />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', padding: '0 12px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ 
              fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', 
              padding: '0 14px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' 
            }}>
              {group.label}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map(item => (
                <NavItem
                  key={item.href}
                  {...item}
                  isActive={item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href) ?? false}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {user?.name ?? 'User'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{plan}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TopHeader({ pathname }: { pathname: string | null }) {
  const segments = useMemo(() => {
    if (!pathname) return []
    return pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1))
  }, [pathname])

  return (
    <header className="frosted" style={{
      height: 60, flexShrink: 0,
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', padding: '0 32px',
      gap: 16, justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, minWidth: 0 }}>
        {segments.map((seg, i) => (
          <div key={seg} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontWeight: i === segments.length - 1 ? 600 : 400,
              color: i === segments.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
              letterSpacing: '-0.01em'
            }}>
              {seg === 'Dashboard' ? 'Overview' : seg}
            </span>
            {i < segments.length - 1 && <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-disabled)' }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Faux search — hotkey hint */}
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 10px 6px 12px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-base)',
            borderRadius: 8,
            color: 'var(--text-tertiary)',
            fontSize: 12.5,
            cursor: 'pointer',
            transition: 'all var(--t-fast)',
            minWidth: 220,
          }}
          className="hover:border-[rgba(255,255,255,0.14)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
          <kbd style={{
            padding: '1px 6px', fontSize: 10.5,
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg-base)', border: '1px solid var(--border-base)',
            borderRadius: 4, color: 'var(--text-secondary)',
          }}>⌘K</kbd>
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border-base)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} className="anim-dot-pulse" />
          <span>Operational</span>
        </div>
      </div>
    </header>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isInitialized, initialize, token } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { initialize() }, [])

  const isDashboard = pathname?.startsWith('/dashboard')

  useEffect(() => {
    if (isDashboard && isInitialized && !token) window.location.href = '/login'
  }, [isDashboard, isInitialized, token])

  if (isDashboard && (!isInitialized || (isInitialized && !token))) {
    return (
      <html lang="en" className="dark">
        <body style={{ background: 'var(--bg-base)', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }} className="anim-fade-in">
            <Logo size={40} />
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <ToastProvider>
          {isDashboard ? (
            <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg-base)', overflow: 'hidden' }}>

              {/* Mobile Sidebar Backdrop */}
              {mobileOpen && (
                <div className="sidebar-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
              )}

              {/* Sidebar */}
              <aside style={{
                width: 240, flexShrink: 0, height: '100%',
                background: 'var(--bg-subtle)', borderRight: '1px solid var(--border-subtle)',
                zIndex: 50, position: 'fixed', left: 0, top: 0,
                transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s cubic-bezier(.16,1,.3,1)',
              }} className="lg:relative lg:translate-x-0">
                <Sidebar user={user} pathname={pathname} onNavClick={() => setMobileOpen(false)} />
              </aside>

              {/* Main Area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                
                {/* Mobile Topbar */}
                <div className="lg:hidden" style={{ height: 52, background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                   <button onClick={() => setMobileOpen(true)} className="btn btn-ghost" style={{ width: 40, height: 40 }}><Menu /></button>
                </div>

                {/* Top Desktop Header */}
                <div className="hidden lg:block">
                  <TopHeader pathname={pathname} />
                </div>

                {/* Main Content Scrollable */}
                <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)' }}>
                  <div style={{ padding: '24px 32px' }}>
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

