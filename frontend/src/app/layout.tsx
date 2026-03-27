'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { ToastProvider } from '@/components/ui/Toast'
import {
  LayoutDashboard, MessageSquare, Plug, FolderOpen, Users,
  CreditCard, Settings, LogOut, ChevronRight, Menu, X
} from 'lucide-react'
import Link from 'next/link'
import '@/globals.css'

const NAV_ITEMS = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/dashboard/chat',         icon: MessageSquare,   label: 'Chat'         },
  { href: '/dashboard/integrations', icon: Plug,            label: 'Integrations' },
  { href: '/dashboard/projects',     icon: FolderOpen,      label: 'Projects'     },
  { href: '/dashboard/team',         icon: Users,           label: 'Team'         },
  { href: '/dashboard/billing',      icon: CreditCard,      label: 'Billing'      },
  { href: '/dashboard/settings',     icon: Settings,        label: 'Settings'     },
]

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="36" height="36">
      <defs>
        <linearGradient id="lCGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b5bff" />
          <stop offset="100%" stopColor="#7c3aff" />
        </linearGradient>
        <linearGradient id="lHGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5e3aff" />
          <stop offset="100%" stopColor="#9f37ff" />
        </linearGradient>
        <filter id="lGlow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50"
        fill="none" stroke="url(#lCGrad)" strokeWidth="5.5" strokeLinecap="round" filter="url(#lGlow)" />
      <circle cx="17" cy="32" r="4" fill="#3b5bff" filter="url(#lGlow)" />
      <g transform="translate(37,32)" filter="url(#lGlow)">
        <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z"
          fill="none" stroke="url(#lHGrad)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#lHGrad)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="0" x2="7" y2="0" stroke="url(#lHGrad)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="4" x2="7" y2="4" stroke="url(#lHGrad)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function NavItem({ item, isActive, onClick }: { item: typeof NAV_ITEMS[0]; isActive: boolean; onClick?: () => void }) {
  const [hov, setHov] = useState(false)
  const Icon = item.icon
  return (
    <Link href={item.href} onClick={onClick}>
      <div
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
        style={{
          background: isActive ? 'rgba(217,119,6,0.1)' : hov ? 'rgba(255,255,255,0.035)' : 'transparent',
          border: isActive ? '1px solid rgba(217,119,6,0.18)' : '1px solid transparent',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
            style={{ background: 'linear-gradient(180deg, #d97706, #f59e0b)' }} />
        )}
        <Icon className="w-[17px] h-[17px] flex-shrink-0 transition-colors duration-150"
          style={{ color: isActive ? '#d97706' : hov ? '#a1a1aa' : '#52525b' }} />
        <span className="text-[13px] font-medium transition-colors duration-150"
          style={{ color: isActive ? '#f59e0b' : hov ? '#d4d4d8' : '#71717a' }}>
          {item.label}
        </span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: '#d97706', boxShadow: '0 0 6px rgba(217,119,6,0.8)' }} />
        )}
      </div>
    </Link>
  )
}

function SidebarContent({ user, pathname, onNavClick, handleLogout }: {
  user: any; pathname: string | null; onNavClick?: () => void; handleLogout: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0d0d1a, #080810)', border: '1px solid rgba(100,80,255,0.2)' }}>
          <Logo />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white tracking-tight leading-none">ContextOS</p>
          <p className="text-[9px] text-dark-600 font-semibold uppercase tracking-[0.15em] mt-0.5">Workspace</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 mt-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.href}
            item={item}
            isActive={item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href) ?? false}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />

      {/* User card */}
      <div className="p-3 space-y-1">
        <Link href="/dashboard/settings" onClick={onNavClick}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => {
              (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')
              ;(e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')
            }}
            onMouseLeave={e => {
              (e.currentTarget.style.background = '')
              ;(e.currentTarget.style.borderColor = 'transparent')
            }}>
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-dark-950" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate leading-tight">{user?.name ?? '—'}</p>
              <p className="text-[9px] text-dark-600 capitalize">{user?.plan ?? 'free'} plan</p>
            </div>
            <ChevronRight className="w-3 h-3 text-dark-700 flex-shrink-0 group-hover:text-dark-500 transition-colors" />
          </div>
        </Link>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] transition-all duration-150"
          style={{ color: '#3f3f46' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(220,38,38,0.06)'); (e.currentTarget.style.color = '#f87171') }}
          onMouseLeave={e => { (e.currentTarget.style.background = ''); (e.currentTarget.style.color = '#3f3f46') }}>
          <LogOut className="w-3.5 h-3.5" />
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { initialize() }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      const s = useAuthStore.getState()
      if (!s.isInitialized) useAuthStore.setState({ isInitialized: true, isLoading: false })
    }, 5000)
    return () => clearTimeout(t)
  }, [])

  // Close sidebar on route change
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
          <div className="flex items-center justify-center min-h-screen bg-dark-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-dark-500 text-sm">{isInitialized ? 'Redirecting…' : 'Loading ContextOS…'}</p>
            </div>
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
            <div className="flex h-screen bg-dark-950 overflow-hidden">

              {/* ── Mobile Overlay ── */}
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-40 lg:hidden"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* ── Sidebar ── */}
              <aside
                className="fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 flex flex-col"
                style={{
                  width: '220px',
                  background: 'linear-gradient(180deg, rgba(12,12,14,0.98) 0%, rgba(9,9,11,0.99) 100%)',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  transform: sidebarOpen ? 'translateX(0)' : undefined,
                  transition: 'transform 0.25s ease',
                }}
              >
                {/* On mobile: hide sidebar off-screen unless open */}
                <style>{`
                  @media (max-width: 1023px) {
                    aside { transform: translateX(-100%); }
                    aside.sidebar-open { transform: translateX(0); }
                  }
                `}</style>
                <div className={`flex flex-col h-full ${sidebarOpen ? 'sidebar-open' : ''}`}
                  style={{ height: '100%' }}>
                  {/* Mobile close button */}
                  <button
                    className="lg:hidden absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-dark-500 hover:text-white transition-colors z-10"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
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

              {/* ── Main ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile top bar */}
                <div
                  className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(9,9,11,0.98)' }}
                >
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-dark-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #0d0d1a, #080810)', border: '1px solid rgba(100,80,255,0.2)', overflow: 'hidden' }}>
                      <Logo />
                    </div>
                    <span className="text-[13px] font-bold text-white">ContextOS</span>
                  </div>
                  {/* Current page label */}
                  <div className="ml-auto">
                    <span className="text-[11px] text-dark-600 capitalize">
                      {NAV_ITEMS.find(n => n.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(n.href))?.label ?? ''}
                    </span>
                  </div>
                </div>

                {/* Main content */}
                <main className="flex-1 overflow-auto relative">
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.012) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }} />
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.025) 0%, transparent 70%)' }} />
                  <div className="relative p-4 sm:p-6 md:p-8 lg:p-10">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          ) : (
            <div className="min-h-screen bg-dark-950">{children}</div>
          )}
        </ToastProvider>
      </body>
    </html>
  )
}
