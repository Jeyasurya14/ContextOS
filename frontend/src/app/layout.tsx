// frontend/src/app/layout.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { LayoutDashboard, MessageSquare, Plug, FolderOpen, Users, CreditCard, Settings, LogOut, Layers, Sparkles } from 'lucide-react'
import Link from 'next/link'
import '@/globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isInitialized, isLoading, initialize, token } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const store = useAuthStore.getState()
      if (!store.isInitialized) {
        useAuthStore.setState({ isInitialized: true, isLoading: false })
      }
    }, 5000)
    return () => clearTimeout(timeout)
  }, [])

  const isDashboard = pathname?.startsWith('/dashboard')
  const isAuth = pathname?.startsWith('/login') ||
                 pathname?.startsWith('/register')

  useEffect(() => {
    if (isDashboard && isInitialized && !token) {
      window.location.href = '/login'
    }
  }, [isDashboard, isInitialized, token])

  if (isDashboard && !isInitialized) {
    return (
      <html lang="en" className="dark">
        <body>
          <div className="flex items-center justify-center min-h-screen bg-dark-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-dark-400 text-sm">Loading ContextOS...</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  if (isDashboard && isInitialized && !token) {
    return (
      <html lang="en" className="dark">
        <body>
          <div className="flex items-center justify-center min-h-screen bg-dark-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-dark-400 text-sm">Redirecting to login...</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  const handleLogout = () => {
    useAuthStore.getState().logout()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/chat', icon: MessageSquare, label: 'Chat' },
    { href: '/dashboard/integrations', icon: Plug, label: 'Integrations' },
    { href: '/dashboard/projects', icon: FolderOpen, label: 'Projects' },
    { href: '/dashboard/team', icon: Users, label: 'Team' },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <html lang="en" className="dark">
      <body>
        <ToastProvider>
          {isDashboard ? (
            <div className="flex h-screen bg-dark-950 overflow-hidden">
              {/* Premium Sidebar */}
              <aside className="w-[240px] flex flex-col flex-shrink-0 relative border-r border-dark-800/30" style={{
                background: 'linear-gradient(180deg, rgba(15,15,17,0.95) 0%, rgba(9,9,11,0.98) 100%)',
              }}>
                {/* Ambient glow behind sidebar */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand/[0.03] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand/[0.02] rounded-full blur-3xl pointer-events-none" />

                {/* Logo section */}
                <div className="p-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-brand to-brand-dark rounded-xl flex items-center justify-center shadow-glow-brand">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-base font-bold text-white tracking-tight">ContextOS</h1>
                      <p className="text-[10px] text-dark-500 font-medium uppercase tracking-widest">Dashboard</p>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-dark-700/50 to-transparent" />

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 mt-2">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                      >
                        <item.icon className={`w-[18px] h-[18px] transition-colors duration-200 ${
                          isActive ? 'text-brand' : 'text-dark-500'
                        }`} />
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand shadow-sm shadow-brand/50" />
                        )}
                      </Link>
                    )
                  })}
                </nav>

                {/* Separator */}
                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-dark-700/50 to-transparent" />

                {/* User Profile Card */}
                <div className="p-3">
                  <div className="glass-card !p-3 !rounded-xl mb-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand/30 to-brand-dark/20 flex items-center justify-center text-brand font-semibold text-sm ring-2 ring-brand/10">
                          {user?.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-dark-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user?.name ?? 'Loading...'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Sparkles className="w-3 h-3 text-brand" />
                          <span className="text-[10px] text-dark-400 capitalize font-medium">
                            {user?.plan ?? 'free'} plan
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-dark-500 hover:text-dark-200 hover:bg-dark-800/30 rounded-xl transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </aside>

              {/* Main Content */}
              <main className="flex-1 overflow-auto relative">
                {/* Subtle ambient background */}
                <div className="absolute inset-0 ambient-dots pointer-events-none opacity-50" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand/[0.02] rounded-full blur-[120px] pointer-events-none" />
                <div className="relative p-6 md:p-10">
                  {children}
                </div>
              </main>
            </div>
          ) : (
            <div className="min-h-screen bg-dark-950">
              {children}
            </div>
          )}
        </ToastProvider>
      </body>
    </html>
  )
}
