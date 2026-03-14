// frontend/src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Database, Plug, MessageSquare, TrendingUp } from 'lucide-react'
import { integrationsApi, billingApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { StatCardSkeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
  const user = useAuthStore(state => state.user)
  const isInitialized = useAuthStore(state => state.isInitialized)

  const [stats, setStats] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Wait for auth to initialize before fetching
    if (!isInitialized) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [statsRes, usageRes, intRes] = await Promise.allSettled([
          integrationsApi.getStats(),
          billingApi.getUsage(),
          integrationsApi.getAll(),
        ])

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data)
        if (intRes.status === 'fulfilled') setIntegrations(intRes.value.data)
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isInitialized])   // ← depend on isInitialized, not user

  // Use Promise.allSettled above so ONE failed API call
  // does not break the entire dashboard

  const connectedCount = integrations.filter((i: any) => i.is_active).length

  // Render with null safety everywhere:
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">
          {/* Safe access — user may be null briefly */}
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-gray-400 mt-1">
          Here is what is happening in your project
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : error ? (
          <div className="col-span-4 bg-red-950 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
            {error} —{' '}
            <button
              className="underline"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <StatCard
              label="Context Chunks"
              value={stats?.total_chunks ?? 0}
              icon={Database}
            />
            <StatCard
              label="Integrations"
              value={connectedCount}
              icon={Plug}
            />
            <StatCard
              label="Queries Today"
              value={usage?.queries_count ?? 0}
              icon={MessageSquare}
            />
            <StatCard
              label="Plan"
              value={(user?.plan ?? 'free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)}
              icon={TrendingUp}
              isText
            />
          </>
        )}
      </div>

      {/* Integration status pills */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
          Integrations
        </h2>
        <div className="flex gap-3">
          {['github', 'notion', 'slack'].map((tool) => {
            const integration = integrations.find(i => i.provider === tool)
            const isConnected = integration?.is_active
            return (
              <div
                key={tool}
                className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2"
              >
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-sm text-gray-300 capitalize">{tool}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        <QuickAction
          href="/dashboard/chat"
          label="Ask a question"
          description="Chat with your project context"
        />
        <QuickAction
          href="/dashboard/integrations"
          label="Connect a tool"
          description="GitHub, Notion, Slack"
        />
        <QuickAction
          href="/dashboard/team"
          label="Invite teammate"
          description="Share context with your team"
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  isText = false,
}: {
  label: string
  value: string | number | null
  icon?: any
  isText?: boolean
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {Icon && <Icon className="w-5 h-5 text-gray-500 mb-3" />}
      <p className="text-3xl font-bold text-white mb-1 capitalize">
        {value === null ? (
          <div className="h-9 w-20 bg-gray-800 rounded animate-pulse" />
        ) : (
          value
        )}
      </p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

function QuickAction({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors group"
    >
      <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
        {label}
      </p>
      <p className="text-gray-500 text-sm mt-1">{description}</p>
    </Link>
  )
}
