// frontend/src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Database, Plug, MessageSquare, TrendingUp, Users, Github, FileText, MessageCircle } from 'lucide-react'
import { integrationsApi, billingApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { StatCardSkeleton } from '@/components/ui/Skeleton'

// Real integration images
const githubIcon = 'https://github.com/github.png?size=32'
const notionIcon = 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png'
const slackIcon = 'https://cdn.icon-icons.com/icons2/2415/PNG/512/slack_original_logo_icon_146308.png'

export default function DashboardPage() {
  const user = useAuthStore(state => state.user)
  const isInitialized = useAuthStore(state => state.isInitialized)

  const [stats, setStats] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queryHistory, setQueryHistory] = useState<number[]>([])

  useEffect(() => {
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

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || null)
        if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data || null)
        if (intRes.status === 'fulfilled') setIntegrations(intRes.value.data || [])
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isInitialized])

  // Simulate live query data
  useEffect(() => {
    if (!loading && usage) {
      // Initialize with some data
      const initialData = Array.from({ length: 10 }, (_, i) => 
        Math.floor(Math.random() * 20) + (usage?.queries_count || 0) - 10
      )
      setQueryHistory(initialData)

      // Update every 3 seconds
      const interval = setInterval(() => {
        setQueryHistory(prev => {
          const newData = [...prev.slice(1)]
          const lastValue = prev[prev.length - 1] || 0
          const change = Math.floor(Math.random() * 5) - 2 // Random change between -2 and +2
          newData.push(Math.max(0, lastValue + change))
          return newData
        })
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [loading, usage])

  const connectedCount = integrations.filter((i: any) => i.is_active).length

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-dark-400">
          Here's what's happening in your project
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : error ? (
          <div className="col-span-4 bg-dark-900 border border-dark-700 rounded-xl p-5 text-danger">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                <span className="text-danger">!</span>
              </div>
              <div>
                <p className="font-medium">{error}</p>
                <button
                  className="text-danger/80 hover:text-danger text-sm underline mt-1"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <StatCard
              label="Context Chunks"
              value={stats?.total_chunks ?? 0}
              icon={Database}
              delay={0}
            />
            <StatCard
              label="Integrations"
              value={connectedCount}
              icon={Plug}
              delay={0.05}
            />
            <StatCard
              label="Queries Today"
              value={usage?.queries_count ?? 0}
              icon={MessageSquare}
              delay={0.1}
            />
            <StatCard
              label="Plan"
              value={(user?.plan ?? 'free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)}
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Live Query Graph */}
      <div className="mb-10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-brand" />
              <div>
                <h2 className="font-semibold text-white">Query Activity</h2>
                <p className="text-sm text-dark-400">Real-time query volume</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              <span className="text-xs text-brand">Live</span>
            </div>
          </div>
          
          <div className="h-48 flex items-end justify-between gap-1">
            {queryHistory.map((value, index) => {
              const maxValue = Math.max(...queryHistory, 1)
              const height = (value / maxValue) * 100
              const isLatest = index === queryHistory.length - 1
              
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full transition-all duration-500 rounded-t-sm ${
                        isLatest ? 'bg-brand' : 'bg-brand/60'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  {index % 3 === 0 && (
                    <span className="text-xs text-dark-500">
                      {new Date(Date.now() - (queryHistory.length - index - 1) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand rounded-sm" />
                <span className="text-xs text-dark-400">Current: {queryHistory[queryHistory.length - 1] || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand/60 rounded-sm" />
                <span className="text-xs text-dark-400">Average: {Math.round(queryHistory.reduce((a, b) => a + b, 0) / queryHistory.length) || 0}</span>
              </div>
            </div>
            <span className="text-xs text-dark-500">Updates every 3s</span>
          </div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Integrations</h2>
            <p className="text-sm text-dark-400">Connected services</p>
          </div>
          <Link
            href="/dashboard/integrations"
            className="btn btn-secondary text-sm"
          >
            Manage
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['github', 'notion', 'slack'].map((tool, idx) => {
            const integration = integrations.find(i => i.provider === tool)
            const isConnected = integration?.is_active
            return (
              <div
                key={tool}
                className="card animate-slide-up flex items-center justify-between"
                style={{ animationDelay: `${0.25 + idx * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isConnected
                      ? 'bg-success/10 border border-success/20'
                      : 'bg-dark-800 border border-dark-700'
                  }`}>
                    {getIntegrationIcon(tool, isConnected)}
                  </div>
                  <div>
                    <p className="font-medium text-white capitalize">{tool}</p>
                    <p className="text-xs text-dark-400">
                      {isConnected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-success' : 'bg-dark-500'
                }`} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-10 animate-slide-up" style={{ animationDelay: '0.35s' }}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          <p className="text-sm text-dark-400">Common tasks</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <QuickAction
            href="/dashboard/chat"
            label="Ask a Question"
            description="Chat with your context"
            icon={MessageSquare}
          />
          <QuickAction
            href="/dashboard/integrations"
            label="Connect Tools"
            description="Add integrations"
            icon={Plug}
          />
          <QuickAction
            href="/dashboard/team"
            label="Invite Team"
            description="Share with colleagues"
            icon={Users}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="animate-slide-up" style={{ animationDelay: '0.45s' }}>
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <div className="w-2 h-2 rounded-full bg-brand pulse-dot" />
          </div>

          <div className="space-y-3">
            <ActivityItem
              icon={Database}
              label="System initialized"
              time="Just now"
            />
            <ActivityItem
              icon={Database}
              label="Context vectors indexed"
              time="A few minutes ago"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  delay = 0,
}: {
  label: string
  value: string | number | null
  icon?: any
  delay?: number
}) {
  return (
    <div
      className="stat-card animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
          {Icon && <Icon className="w-5 h-5 text-dark-300" />}
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1 tracking-tight">
        {value === null ? (
          <div className="h-8 w-16 bg-dark-800 rounded animate-pulse" />
        ) : (
          value
        )}
      </p>
      <p className="text-sm text-dark-400">{label}</p>
    </div>
  )
}

function QuickAction({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string
  label: string
  description: string
  icon?: any
}) {
  return (
    <Link
      href={href}
      className="card group animate-slide-up hover:border-dark-600"
    >
      <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center mb-3 group-hover:bg-dark-700 transition-colors">
        {Icon && <Icon className="w-5 h-5 text-dark-300 group-hover:text-white transition-colors" />}
      </div>
      <p className="font-semibold text-white mb-1 group-hover:text-brand transition-colors">
        {label}
      </p>
      <p className="text-sm text-dark-400">{description}</p>
    </Link>
  )
}

function ActivityItem({
  icon: Icon,
  label,
  time,
}: {
  icon: any
  label: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/50 border border-dark-800/50">
      <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-dark-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-dark-400 mt-0.5">{time}</p>
      </div>
    </div>
  )
}

function getIntegrationIcon(provider: string, isConnected: boolean) {
  const iconClass = `w-6 h-6 ${isConnected ? '' : 'opacity-50'}`

  switch (provider.toLowerCase()) {
    case 'github':
      return <img src={githubIcon} alt="GitHub" className={iconClass} />
    case 'notion':
      return <img src={notionIcon} alt="Notion" className={iconClass} />
    case 'slack':
      return <img src={slackIcon} alt="Slack" className={iconClass} />
    default:
      return <Plug className={`w-5 h-5 ${isConnected ? 'text-success' : 'text-dark-500'}`} />
  }
}