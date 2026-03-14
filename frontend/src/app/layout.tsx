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

  // Redirect to login if on dashboard without token (after initialization)
  useEffect(() => {
    if (isDashboard && isInitialized && !token) {
      router.replace('/login')
    }
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
            <div className="flex h-screen bg-gray-950">
              <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-800">
                  <h1 className="text-xl font-bold text-white">ContextOS</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                  <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/dashboard'} />
                  <NavLink href="/dashboard/chat" icon={MessageSquare} label="Chat" active={pathname === '/dashboard/chat'} />
                  <NavLink href="/dashboard/integrations" icon={Plug} label="Integrations" active={pathname === '/dashboard/integrations'} />
                  <NavLink href="/dashboard/projects" icon={FolderOpen} label="Projects" active={pathname === '/dashboard/projects'} />
                  <NavLink href="/dashboard/team" icon={Users} label="Team" active={pathname === '/dashboard/team'} />
                  <NavLink href="/dashboard/billing" icon={CreditCard} label="Billing" active={pathname === '/dashboard/billing'} />
                  <NavLink href="/dashboard/settings" icon={Settings} label="Settings" active={pathname === '/dashboard/settings'} />
                </nav>
                <div className="p-4 border-t border-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user?.name ?? 'Loading...'}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {user?.plan ?? 'free'} plan
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </aside>
              <main className="flex-1 overflow-auto">
                <div className="p-8">
                  {children}
                </div>
              </main>
            </div>
          ) : (
            <div className="min-h-screen bg-gray-950">
              {children}
            </div>
          )}
        </ToastProvider>
      </body>
    </html>
  )
}

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition ${
        active
          ? 'bg-gray-800 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  )
}
