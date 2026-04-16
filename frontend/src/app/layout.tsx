'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { ToastProvider } from '@/components/ui/Toast'
import {
  LayoutDashboard, MessageSquare, Plug, FolderOpen, Users,
  CreditCard, Settings, LogOut, ChevronRight, Menu, X, Sparkles,
  Activity, Zap,
} from 'lucide-react'
import Link from 'next/link'
import '@/globals.css'

const NAV_ITEMS = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Overview',     color: '#f59e0b' },
  { href: '/dashboard/chat',         icon: MessageSquare,   label: 'Chat',         color: '#8b5cf6' },
  { href: '/dashboard/integrations', icon: Plug,            label: 'Integrations', color: '#06b6d4' },
  { href: '/dashboard/projects',     icon: FolderOpen,      label: 'Projects',     color: '#10b981' },
  { href: '/dashboard/team',         icon: Users,           label: 'Team',         color: '#f43f5e' },
  { href: '/dashboard/billing',      icon: CreditCard,      label: 'Billing',      color: '#f59e0b' },
  { href: '/dashboard/settings',     icon: Settings,        label: 'Settings',     color: '#a78bfa' },
]

const NAV_CATEGORIES = [
  { label: 'Workspace', items: NAV_ITEMS.slice(0, 4) },
  { label: 'Account', items: NAV_ITEMS.slice(4) },
]

/* ── Premium Logo ─────────────────────────────────────────────── */
function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="lgC" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="lgH" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="lgGlow">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50"
        fill="none" stroke="url(#lgC)" strokeWidth="5.5" strokeLinecap="round" filter="url(#lgGlow)" />
      <circle cx="17" cy="32" r="4" fill="#f59e0b" filter="url(#lgGlow)" />
      <g transform="translate(37,32)" filter="url(#lgGlow)">
        <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z"
          fill="none" stroke="url(#lgH)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#lgH)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="0"  x2="7" y2="0"  stroke="url(#lgH)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="4"  x2="7" y2="4"  stroke="url(#lgH)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/* ── Nav Item ─────────────────────────────────────────────────── */
function NavItem({ item, isActive, onClick }: {
  item: typeof NAV_ITEMS[0]; isActive: boolean; onClick?: () => void
}) {
  const Icon = item.icon
  return (
    <Link href={item.href} onClick={onClick}>
      <div
        className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
        style={isActive ? {
          background: `${item.color}12`,
          borderColor: `${item.color}25`,
          color: item.color,
        } : {}}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: isActive ? `${item.color}18` : 'rgba(255,255,255,0.03)',
            border: isActive ? `1px solid ${item.color}25` : '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: isActive ? item.color : 'rgb(90,90,115)' }} />
        </div>
        <span className="flex-1 text-[13px] font-medium">{item.label}</span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
        )}
      </div>
    </Link>
  )
}

/* ── Sidebar Content ──────────────────────────────────────────── */
function SidebarContent({ user, pathname, onNavClick, handleLogout }: {
  user: any; pathname: string | null; onNavClick?: () => void; handleLogout: () => void
}) {
  const planColors: Record<string, string> = {
    free: '#8b5cf6', pro: '#f59e0b', enterprise: '#06b6d4',
  }
  const plan = (user?.plan ?? 'free').toLowerCase()
  const planColor = planColors[plan] || '#8b5cf6'

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.08))',
              border: '1px solid rgba(245,158,11,0.2)',
              boxShadow: '0 0 12px rgba(245,158,11,0.1)',
            }}>
            <Logo size={28} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight leading-none">ContextOS</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: 'ping2 3s ease-in-out infinite', boxShadow: '0 0 4px #10b981' }} />
              <p className="text-[9px] font-semibold text-emerald-400 uppercase tracking-[0.12em]">Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4"><div className="divider" /></div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 pt-3 pb-2 space-y-4 overflow-y-auto">
        {NAV_CATEGORIES.map(cat => (
          <div key={cat.label}>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-1.5"
              style={{ color: 'rgba(100,100,130,0.7)' }}>
              {cat.label}
            </p>
            <div className="space-y-0.5">
              {cat.items.map(item => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname?.startsWith(item.href) ?? false
                  }
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4"><div className="divider" /></div>

      {/* ── User card ── */}
      <div className="p-3 space-y-1">
        {/* Plan badge */}
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <Zap className="w-3 h-3" style={{ color: planColor }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: planColor }}>
            {plan} plan
          </span>
          {plan === 'free' && (
            <Link href="/dashboard/billing" className="ml-auto">
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-all"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}>
                Upgrade
              </span>
            </Link>
          )}
        </div>

        <Link href="/dashboard/settings" onClick={onNavClick}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all duration-200"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = ''
              e.currentTarget.style.borderColor = 'transparent'
            }}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
                style={{ background: 'linear-gradient(135deg, #d97706, #7c3aed)' }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2"
                style={{ borderColor: 'rgb(8,8,18)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate leading-tight">{user?.name ?? '—'}</p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(100,100,130,0.8)' }}>
                {user?.email ?? ''}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: 'rgb(150,150,175)' }} />
          </div>
        </Link>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-200"
          style={{ color: 'rgba(100,100,130,0.7)', border: '1px solid transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(244,63,94,0.06)'
            e.currentTarget.style.borderColor = 'rgba(244,63,94,0.12)'
            e.currentTarget.style.color = '#fb7185'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = ''
            e.currentTarget.style.borderColor = 'transparent'
            e.currentTarget.style.color = 'rgba(100,100,130,0.7)'
          }}>
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )
}

/* ── Root Layout ──────────────────────────────────────────────── */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isInitialized, isLoading, initialize, token } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { initialize() }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      const s = useAuthStore.getState()
      if (!s.isInitialized) useAuthStore.setState({ isInitialized: true, isLoading: false })
    }, 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const isDashboard = pathname?.startsWith('/dashboard')

  useEffect(() => {
    if (isDashboard && isInitialized && !token) window.location.href = '/login'
  }, [isDashboard, isInitialized, token])

  const handleLogout = () => { useAuthStore.getState().logout(); router.push('/login') }

  if (isDashboard && (!isInitialized || (isInitialized && !token))) {
    return (
      <html lang="en" className="dark">
        <body>
          <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgb(8,8,18)', position: 'relative', overflow: 'hidden',
          }}>
            {/* orbs */}
            <div style={{
              position: 'absolute', top: '20%', left: '30%',
              width: 300, height: 300, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
              filter: 'blur(60px)', pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: '20%', right: '30%',
              width: 250, height: 250, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
              filter: 'blur(60px)', pointerEvents: 'none',
            }} />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              {/* Spinning ring */}
              <div style={{ position: 'relative', width: 48, height: 48, margin: '0 auto 16px' }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid rgba(245,158,11,0.15)',
                }} />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: '#f59e0b',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: 10, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Logo size={18} />
                </div>
              </div>
              <p style={{ color: 'rgba(150,150,180,0.8)', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>
                {isInitialized ? 'Redirecting…' : 'Loading ContextOS…'}
              </p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <ToastProvider>
          {isDashboard ? (
            <div className="flex" style={{ height: '100dvh', background: 'rgb(8,8,18)', overflow: 'hidden' }}>

              {/* ── Animated ambient background ── */}
              <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                {/* Top-right amber orb */}
                <div style={{
                  position: 'absolute', top: '-10%', right: '-5%',
                  width: 600, height: 600, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)',
                  filter: 'blur(40px)',
                  animation: 'glowPulse 8s ease-in-out infinite',
                }} />
                {/* Bottom-left violet orb */}
                <div style={{
                  position: 'absolute', bottom: '-10%', left: '-5%',
                  width: 500, height: 500, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)',
                  filter: 'blur(40px)',
                  animation: 'glowPulse 10s ease-in-out infinite',
                  animationDelay: '3s',
                }} />
                {/* Dot grid */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }} />
              </div>

              {/* ── Mobile Overlay ── */}
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-40 lg:hidden"
                  style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* ── Sidebar ── */}
              <aside
                style={{
                  width: 228,
                  flexShrink: 0,
                  height: '100%',
                  background: 'linear-gradient(180deg, rgba(12,12,22,0.97) 0%, rgba(8,8,18,0.98) 100%)',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  backdropFilter: 'blur(20px)',
                }}
                className="fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 flex flex-col"
              >
                <style>{`
                  @media (max-width: 1023px) {
                    aside { transform: translateX(-100%) !important; transition: transform 0.28s cubic-bezier(0.16,1,0.3,1); }
                    aside.open { transform: translateX(0) !important; }
                  }
                  @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
                  @keyframes ping2 { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.3} }
                `}</style>

                <div className={`flex flex-col h-full ${sidebarOpen ? 'open' : ''}`}
                  style={{ height: '100%' }}>
                  {/* Mobile close */}
                  <button
                    className="lg:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl z-10 transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgb(150,150,175)',
                    }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <SidebarContent
                    user={user}
                    pathname={pathname}
                    onNavClick={() => setSidebarOpen(false)}
                    handleLogout={handleLogout}
                  />
                </div>
              </aside>

              {/* ── Main area ── */}
              <div className="flex-1 flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>

                {/* Mobile top bar */}
                <div
                  className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
                  style={{
                    background: 'rgba(8,8,18,0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <Menu className="w-4 h-4" style={{ color: 'rgb(150,150,175)' }} />
                  </button>
                  <div className="flex items-center gap-2">
                    <Logo size={22} />
                    <span className="text-[14px] font-bold text-white">ContextOS</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'rgba(245,158,11,0.6)' }} />
                    <span className="text-[11px] font-medium" style={{ color: 'rgba(150,150,175,0.7)' }}>
                      {NAV_ITEMS.find(n =>
                        n.href === '/dashboard'
                          ? pathname === '/dashboard'
                          : pathname?.startsWith(n.href)
                      )?.label ?? ''}
                    </span>
                  </div>
                </div>

                {/* Main content scroll area */}
                <main className="flex-1 overflow-auto" style={{ position: 'relative' }}>
                  <div className="relative p-4 sm:p-6 md:p-8 lg:p-10" style={{ minHeight: '100%' }}>
                    {children}
                  </div>
                </main>
              </div>
            </div>
          ) : (
            <div style={{ minHeight: '100vh', background: 'rgb(8,8,18)' }}>{children}</div>
          )}
        </ToastProvider>
      </body>
    </html>
  )
}
