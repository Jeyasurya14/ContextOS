'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { ToastProvider } from '@/components/ui/Toast'
import {
  LayoutDashboard, MessageSquare, Plug, FolderOpen,
  Users, CreditCard, Settings, LogOut, ChevronRight, Menu, X, Zap,
  Globe, Terminal, Activity, Database, Archive, Layers, RefreshCw
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
      
      {/* Workspace Switcher */}
      <div style={{ padding: '16px', marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderRadius: 'var(--r-md)',
          background: 'var(--bg-raised)', border: '1px solid var(--border-base)',
          cursor: 'pointer', transition: 'all var(--t-fast)'
        }}
        className="hover:border-[rgba(255,255,255,0.12)]"
        >
          <div style={{ 
            width: 32, height: 32, borderRadius: 'var(--r-md)', 
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Logo size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>ContextOS</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Workspace</p>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-tertiary)', opacity: 0.5 }} />
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
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 600, color: '#000'
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
    <header style={{ 
      height: 52, flexShrink: 0, 
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', padding: '0 24px', 
      gap: 12, justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Globe style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Workspace</span>
          <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-disabled)' }} />
          {segments.map((seg, i) => (
            <div key={seg} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: i === segments.length - 1 ? 600 : 400, color: i === segments.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {seg === 'Dashboard' ? 'Overview' : seg}
              </span>
              {i < segments.length - 1 && <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-disabled)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} className="anim-dot-pulse" />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>Global Index Active</span>
        </div>
        <div style={{ height: 16, width: 1, background: 'var(--border-base)' }} />
        <button className="btn btn-secondary btn-sm" style={{ height: 28, fontSize: 12 }}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Force Sync
        </button>
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

