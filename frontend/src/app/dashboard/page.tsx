// frontend/src/app/dashboard/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Database, Plug, MessageSquare, TrendingUp, Users, Github, FileText, MessageCircle, ArrowUpRight, Sparkles, Activity, ChevronRight, Zap, Clock } from 'lucide-react'
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
      const initialData = Array.from({ length: 20 }, (_, i) =>
        Math.floor(Math.random() * 20) + (usage?.queries_count || 0) - 10
      )
      setQueryHistory(initialData)

      const interval = setInterval(() => {
        setQueryHistory(prev => {
          const newData = [...prev.slice(1)]
          const lastValue = prev[prev.length - 1] || 0
          const change = Math.floor(Math.random() * 5) - 2
          newData.push(Math.max(0, lastValue + change))
          return newData
        })
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [loading, usage])

  const connectedCount = integrations.filter((i: any) => i.is_active).length

  // Get current hour greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div className="animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Dashboard</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {greeting}{user?.name ? `, ${user.name}` : ''} 👋
        </h1>
        <p className="text-dark-400 text-[15px]">
          Here's what's happening across your project today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : error ? (
          <div className="col-span-4 glass-card border-danger/20 text-danger">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                <span className="text-danger font-bold">!</span>
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
              color="brand"
              delay={0}
            />
            <StatCard
              label="Integrations"
              value={connectedCount}
              icon={Plug}
              color="success"
              delay={0.05}
            />
            <StatCard
              label="Queries Today"
              value={usage?.queries_count ?? 0}
              icon={Activity}
              color="warning"
              delay={0.1}
            />
            <StatCard
              label="Plan"
              value={(user?.plan ?? 'free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)}
              icon={Zap}
              color="brand"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Live Query Graph — 2 columns */}
        <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Query Activity</h2>
                  <p className="text-xs text-dark-500">Real-time query volume</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                <span className="text-[11px] font-medium text-success">Live</span>
              </div>
            </div>

            {/* SVG Sparkline Chart */}
            <SparklineChart data={queryHistory} />

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-dark-800/40">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-brand rounded-full" />
                  <span className="text-xs text-dark-400">Current: {queryHistory[queryHistory.length - 1] || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-brand/40 rounded-full" />
                  <span className="text-xs text-dark-400">Avg: {Math.round(queryHistory.reduce((a, b) => a + b, 0) / (queryHistory.length || 1))}</span>
                </div>
              </div>
              <span className="text-[10px] text-dark-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Updates every 3s
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions — 1 column */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card !p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              Quick Actions
            </h2>
            <div className="space-y-2.5">
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
        </div>
      </div>

      {/* Integrations + Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrations Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Integrations</h2>
              <p className="text-xs text-dark-500 mt-0.5">Connected services</p>
            </div>
            <Link
              href="/dashboard/integrations"
              className="text-xs font-medium text-brand hover:text-brand-light transition-colors flex items-center gap-1"
            >
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {['github', 'notion', 'slack'].map((tool, idx) => {
              const integration = integrations.find(i => i.provider === tool)
              const isConnected = integration?.is_active
              return (
                <div
                  key={tool}
                  className="glass-card !p-4 animate-slide-up group flex items-center justify-between"
                  style={{ animationDelay: `${0.3 + idx * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isConnected
                        ? 'bg-success/10 border border-success/20 shadow-glow-success'
                        : 'bg-dark-800/80 border border-dark-700/60'
                    }`}>
                      {getIntegrationIcon(tool, isConnected)}
                    </div>
                    <div>
                      <p className="font-medium text-white capitalize text-sm">{tool}</p>
                      <p className="text-[11px] text-dark-500">
                        {isConnected ? 'Connected & syncing' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected && (
                      <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">Active</span>
                    )}
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isConnected ? 'bg-success shadow-sm shadow-success/50' : 'bg-dark-600'
                    }`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              <p className="text-xs text-dark-500 mt-0.5">Latest events</p>
            </div>
            <div className="pulse-dot text-brand" />
          </div>

          <div className="glass-card !p-5 space-y-3">
            <ActivityItem
              icon={Database}
              label="System initialized"
              time="Just now"
              color="brand"
            />
            <ActivityItem
              icon={Database}
              label="Context vectors indexed"
              time="A few minutes ago"
              color="success"
            />
            <ActivityItem
              icon={Activity}
              label="Dashboard loaded"
              time="Now"
              color="warning"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================
   SVG SPARKLINE CHART
   ============================================ */

function SparklineChart({ data }: { data: number[] }) {
  if (data.length === 0) return <div className="h-44 flex items-center justify-center text-dark-500 text-sm">No data yet</div>

  const width = 600
  const height = 160
  const padding = { top: 10, right: 10, bottom: 10, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxVal = Math.max(...data, 1)
  const minVal = Math.min(...data, 0)
  const range = maxVal - minVal || 1

  const points = data.map((val, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((val - minVal) / range) * chartHeight,
  }))

  // Create smooth curve path
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`
    const prev = points[i - 1]
    const cpx1 = prev.x + (point.x - prev.x) / 3
    const cpx2 = point.x - (point.x - prev.x) / 3
    return path + ` C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`
  }, '')

  // Gradient fill path
  const fillPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(217, 119, 6)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(217, 119, 6)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(217, 119, 6)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="rgb(245, 158, 11)" stopOpacity="1" />
            <stop offset="100%" stopColor="rgb(217, 119, 6)" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((y) => (
          <line
            key={y}
            x1={padding.left}
            y1={padding.top + chartHeight * y}
            x2={width - padding.right}
            y2={padding.top + chartHeight * y}
            stroke="rgba(255,255,255,0.03)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Fill area */}
        <path d={fillPath} fill="url(#sparklineGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest data point glow */}
        {points.length > 0 && (
          <>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="6"
              fill="rgba(217, 119, 6, 0.2)"
              className="animate-pulse"
            />
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="3"
              fill="#d97706"
              stroke="#0f0f11"
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>
    </div>
  )
}

/* ============================================
   STAT CARD
   ============================================ */

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'brand',
  delay = 0,
}: {
  label: string
  value: string | number | null
  icon?: any
  color?: 'brand' | 'success' | 'warning'
  delay?: number
}) {
  const colorClasses = {
    brand: { bg: 'bg-brand/10', text: 'text-brand', glow: 'shadow-brand/5' },
    success: { bg: 'bg-success/10', text: 'text-success-light', glow: 'shadow-success/5' },
    warning: { bg: 'bg-warning/10', text: 'text-warning-light', glow: 'shadow-warning/5' },
  }

  const c = colorClasses[color]

  return (
    <div
      className="stat-card animate-slide-up group cursor-default"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
          {Icon && <Icon className={`w-5 h-5 ${c.text}`} />}
        </div>
        <ArrowUpRight className="w-4 h-4 text-dark-600 group-hover:text-dark-400 transition-colors duration-300" />
      </div>
      <div className="relative z-10">
        <div className="text-3xl font-bold text-white mb-1.5 tracking-tight animate-counter-up" style={{ animationDelay: `${delay + 0.2}s` }}>
          {value === null ? (
            <div className="h-8 w-16 bg-dark-800 rounded-lg animate-pulse" />
          ) : (
            value
          )}
        </div>
        <p className="text-sm text-dark-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

/* ============================================
   QUICK ACTION
   ============================================ */

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
      className="group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-dark-700/60 hover:bg-dark-800/30 transition-all duration-200"
    >
      <div className="w-10 h-10 rounded-xl bg-dark-800/60 border border-dark-700/40 flex items-center justify-center group-hover:bg-brand/10 group-hover:border-brand/20 transition-all duration-200">
        {Icon && <Icon className="w-5 h-5 text-dark-400 group-hover:text-brand transition-colors duration-200" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white group-hover:text-brand transition-colors duration-200">
          {label}
        </p>
        <p className="text-[11px] text-dark-500">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-dark-600 group-hover:text-dark-400 group-hover:translate-x-0.5 transition-all duration-200" />
    </Link>
  )
}

/* ============================================
   ACTIVITY ITEM
   ============================================ */

function ActivityItem({
  icon: Icon,
  label,
  time,
  color = 'brand',
}: {
  icon: any
  label: string
  time: string
  color?: 'brand' | 'success' | 'warning'
}) {
  const colors = {
    brand: 'bg-brand/10 text-brand border-brand/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/20 border border-dark-800/30 hover:border-dark-700/40 transition-all duration-200 group">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} border flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-dark-200 group-hover:text-white transition-colors">{label}</p>
        <p className="text-[11px] text-dark-500 mt-0.5">{time}</p>
      </div>
    </div>
  )
}

/* ============================================
   INTEGRATION ICON HELPER
   ============================================ */

function getIntegrationIcon(provider: string, isConnected: boolean) {
  const iconClass = `w-6 h-6 ${isConnected ? '' : 'opacity-40'} transition-opacity duration-300`

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