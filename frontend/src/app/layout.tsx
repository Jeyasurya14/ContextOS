// frontend/src/app/layout.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { LayoutDashboard, MessageSquare, Plug, FolderOpen, Users, CreditCard, Settings, LogOut } from 'lucide-react'
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

  console.log('Auth state - isInitialized:', isInitialized, 'token exists:', !!token, 'isDashboard:', pathname?.startsWith('/dashboard'))

  console.log('RootLayout pathname:', pathname)

  useEffect(() => {
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Safety timeout — if initialize() hangs for any reason,
  // force isInitialized after 5 seconds
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

  console.log('isDashboard:', isDashboard, 'pathname:', pathname)

  // Redirect to login if on dashboard without token (after initialization)
  useEffect(() => {
    console.log('Auth redirect check - isDashboard:', isDashboard, 'isInitialized:', isInitialized, 'hasToken:', !!token)
    // COMMENTED OUT FOR DEBUGGING - if (isDashboard && isInitialized && !token) {
    //   console.log('Redirecting to login - no token')
    //   router.replace('/login')
    // }
  }, [isDashboard, isInitialized, token, router])

  // Only block dashboard routes while initializing
  if (isDashboard && !isInitialized) {
    return (
      <html lang="en" className="dark">
        <body>
          <div className="flex items-center justify-center min-h-screen bg-gray-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading ContextOS...</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  // Show loading while redirecting
  if (isDashboard && isInitialized && !token) {
    return null
  }

  const handleLogout = () => {
    useAuthStore.getState().logout()
    router.push('/login')
  }

  return (
    <html lang="en" className="dark">
      <body>
        <ToastProvider>
          {isDashboard ? (
            <div className="flex h-screen bg-dark-950">
              <aside className="w-56 bg-dark-900/50 border-r border-dark-800/40 flex flex-col flex-shrink-0">
                {/* Logo */}
                <div className="p-5 border-b border-dark-800/30">
                  <h1 className="text-lg font-semibold text-white tracking-tight">ContextOS</h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 pointer-events-auto">
                  {[
                    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    { href: '/dashboard/chat', icon: MessageSquare, label: 'Chat' },
                    { href: '/dashboard/integrations', icon: Plug, label: 'Integrations' },
                    { href: '/dashboard/projects', icon: FolderOpen, label: 'Projects' },
                    { href: '/dashboard/team', icon: Users, label: 'Team' },
                    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
                    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all pointer-events-auto cursor-pointer ${
                        pathname === item.href
                          ? 'bg-brand/10 text-brand border border-brand/20'
                          : 'text-dark-400 hover:text-white hover:bg-dark-800/40'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${pathname === item.href ? 'text-brand' : 'text-dark-500'}`} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>

                {/* User Profile */}
                <div className="p-3 border-t border-dark-800/30">
                  <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg bg-dark-800/40 border border-dark-700/30 pointer-events-auto">
                    <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-medium text-sm">
                      {user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user?.name ?? 'Loading...'}
                      </p>
                      <p className="text-[10px] text-dark-400 capitalize">
                        {user?.plan ?? 'free'} plan
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-400 hover:text-white hover:bg-dark-800/50 rounded-lg transition-all pointer-events-auto"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </aside>
              <main className="flex-1 overflow-auto">
                <div className="p-6 md:p-10">
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

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  const handleClick = (e: React.MouseEvent) => {
    console.log('NavLink clicked:', href, 'e.defaultPrevented:', e.defaultPrevented, 'currentPathname:', window.location.pathname)
    // Try manual navigation
    // window.location.href = href
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all pointer-events-auto cursor-pointer ${
        active
          ? 'bg-brand/10 text-brand border border-brand/20'
          : 'text-dark-400 hover:text-white hover:bg-dark-800/40'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-brand' : 'text-dark-500'}`} />
      <span>{label}</span>
    </Link>
  )
}
