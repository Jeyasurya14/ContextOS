// frontend/src/app/dashboard/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, MessageSquare, Plug, FolderOpen,
  Users, CreditCard, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderOpen },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-dark-900 border-r border-dark-700 flex flex-col fixed h-full">
        <div className="p-4 border-b border-dark-700">
          <Link href="/dashboard" className="text-lg font-bold text-dark-50">
            ContextOS
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                  isActive
                    ? 'bg-brand/10 text-brand-light'
                    : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-dark-700">
          <div className="text-xs text-dark-400 mb-2 px-3 truncate">
            {user?.email || 'Not logged in'}
          </div>
          <button
            onClick={() => { logout(); window.location.href = '/login'; }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-dark-400 hover:text-danger hover:bg-dark-800 transition w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 p-8">
        {children}
      </main>
    </div>
  );
}
