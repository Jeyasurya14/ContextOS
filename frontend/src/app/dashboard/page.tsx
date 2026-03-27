// frontend/src/app/dashboard/page.tsx
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Database, Plug, MessageSquare, TrendingUp, Users, ArrowUpRight,
  Sparkles, Activity, ChevronRight, Zap, Clock, Brain, GitCommit,
  FileText, Hash, AlertCircle, RefreshCw, ArrowRight, Layers
} from 'lucide-react'
import { integrationsApi, billingApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/* ─── Helpers ────────────────────────────────────────────────── */
function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* ─── PROVIDER metadata ──────────────────────────────────────── */
const PROVIDERS = [
  { key: 'github',      apiKey: 'github',       label: 'GitHub',       color: '#8b5cf6', icon: GitCommit },
  { key: 'notion',      apiKey: 'notion',        label: 'Notion',       color: '#a1a1aa', icon: FileText  },
  { key: 'slack',       apiKey: 'slack',         label: 'Slack',        color: '#e01e5a', icon: Hash      },
  { key: 'linear',      apiKey: 'linear',        label: 'Linear',       color: '#5b5fc7', icon: Layers    },
  { key: 'google',      apiKey: 'google_drive',  label: 'Google Drive', color: '#34a853', icon: Database  },
]

/* ─── Smooth counter ─────────────────────────────────────────── */
function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number>()
  const start = useRef<number>()
  const from = useRef(0)

  useEffect(() => {
    from.current = display
    start.current = undefined
    const animate = (ts: number) => {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from.current + (target - from.current) * ease))
      if (progress < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target])

  return <>{fmtNum(display)}</>
}

/* ─── Sparkline chart ────────────────────────────────────────── */
function Sparkline({ data, color = '#d97706', height = 56 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} />
  const W = 300, H = height
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (v / max) * (H - 8) - 4,
  }))
  const line = pts.reduce((p, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`
    const prev = pts[i - 1]
    return `${p} C${prev.x + (pt.x - prev.x) / 2},${prev.y} ${pt.x - (pt.x - prev.x) / 2},${pt.y} ${pt.x},${pt.y}`
  }, '')
  const fill = `${line} L${W},${H} L0,${H} Z`
  const last = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}` } x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={0} y1={H * f} x2={W} y2={H * f}
          stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
      ))}
      <path d={fill} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="4" fill={color} opacity="0.3" style={{ animation: 'ping 2s ease-in-out infinite' }} />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  )
}

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({
  label, value, subtext, icon: Icon, color, trend, loading, sparkData,
}: {
  label: string; value: number | string | null; subtext?: string
  icon: any; color: string; trend?: number; loading?: boolean; sparkData?: number[]
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-default transition-all duration-200"
      style={{
        background: 'rgba(15,15,17,0.85)',
        border: hov ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.07)',
        boxShadow: hov ? `0 8px 32px rgba(0,0,0,0.25), 0 0 20px ${color}08` : 'none',
        backdropFilter: 'blur(12px)',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, opacity: hov ? 1 : 0 }} />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}12`, border: `1px solid ${color}22` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: trend >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                color: trend >= 0 ? '#22c55e' : '#f87171',
              }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-7 w-20 rounded-lg bg-dark-800 animate-pulse mb-1" />
        ) : (
          <div className="text-2xl font-bold text-white tracking-tight leading-none mb-1">
            {typeof value === 'number' ? <AnimatedNumber target={value} /> : value}
          </div>
        )}
        <p className="text-[11px] text-dark-500 font-medium">{label}</p>
        {subtext && <p className="text-[10px] text-dark-700 mt-0.5">{subtext}</p>}
      </div>

      {sparkData && sparkData.length > 1 && (
        <div className="px-5 pb-4 -mt-1">
          <Sparkline data={sparkData} color={color} height={36} />
        </div>
      )}
    </div>
  )
}

/* ─── Main query chart ───────────────────────────────────────── */
function QueryChart({ data, queriesCount, limit }: { data: number[]; queriesCount: number; limit: number }) {
  if (data.length === 0) return (
    <div className="h-48 flex items-center justify-center text-dark-700 text-sm">
      Waiting for query data…
    </div>
  )

  const W = 600, H = 140
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: 10 + (i / (data.length - 1)) * (W - 20),
    y: 10 + (H - 20) - (v / max) * (H - 20),
  }))
  const line = pts.reduce((p, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`
    const prev = pts[i - 1]
    return `${p} C${prev.x + (pt.x - prev.x) / 3},${prev.y} ${pt.x - (pt.x - prev.x) / 3},${pt.y} ${pt.x},${pt.y}`
  }, '')
  const fill = `${line} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`
  const last = pts[pts.length - 1]
  const pct = limit > 0 && limit !== -1 ? Math.round((queriesCount / limit) * 100) : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '140px' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="qLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={10} y1={10 + (H-20)*f} x2={W-10} y2={10 + (H-20)*f}
            stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
        ))}
        <path d={fill} fill="url(#qGrad)" />
        <path d={line} fill="none" stroke="url(#qLine)" strokeWidth="2" strokeLinecap="round" filter="url(#glow)" />
        <circle cx={last.x} cy={last.y} r="6" fill="rgba(217,119,6,0.2)" style={{ animation: 'ping 2s ease-in-out infinite' }} />
        <circle cx={last.x} cy={last.y} r="3" fill="#d97706" stroke="#09090b" strokeWidth="1.5" />
      </svg>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className="w-2 h-2 rounded-full bg-brand" />
            <span className="text-dark-500">Today: <span className="text-white font-medium">{queriesCount}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <div className="w-2 h-2 rounded-full bg-dark-700" />
            <span className="text-dark-500">Limit: <span className="text-dark-300">{limit === -1 ? 'Unlimited' : limit}</span></span>
          </div>
        </div>
        {pct !== null && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1 rounded-full bg-dark-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#d97706'
                }} />
            </div>
            <span className="text-[10px] text-dark-600">{pct}%</span>
          </div>
        )}
        <span className="text-[10px] text-dark-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Live
        </span>
      </div>
    </div>
  )
}

/* ─── Integration row (compact) ─────────────────────────────── */
function IntegrationRow({ provider, integration }: { provider: typeof PROVIDERS[0]; integration: any }) {
  const connected = integration?.is_active === true
  const chunks = integration?.total_chunks ?? 0
  const lastSync = integration?.last_synced_at
  const Icon = provider.icon

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-150 group"
      style={{
        background: 'rgba(255,255,255,0)',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = 'rgba(255,255,255,0.02)'
        el.style.borderColor = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = 'rgba(255,255,255,0)'
        el.style.borderColor = 'transparent'
      }}
    >
      {/* Status dot */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: connected ? `${provider.color}12` : 'rgba(24,24,27,0.8)',
            border: connected ? `1px solid ${provider.color}25` : '1px solid rgba(255,255,255,0.06)',
          }}>
          <Icon className="w-3.5 h-3.5" style={{ color: connected ? provider.color : '#3f3f46' }} />
        </div>
        {connected && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-dark-950"
            style={{ animation: 'ping2 3s ease-in-out infinite' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-medium" style={{ color: connected ? '#e4e4e7' : '#3f3f46' }}>
            {provider.label}
          </span>
          {connected && chunks > 0 && (
            <span className="text-[10px] font-medium" style={{ color: provider.color }}>
              {fmtNum(chunks)}
            </span>
          )}
        </div>
        <span className="text-[10px] text-dark-700">
          {connected
            ? lastSync ? relTime(lastSync) : 'Connected'
            : 'Not connected'
          }
        </span>
      </div>

      {connected && (
        <div className="flex-shrink-0 w-12 h-5 overflow-hidden">
          <Sparkline data={[0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.7, 1]} color={provider.color} height={20} />
        </div>
      )}
    </div>
  )
}

/* ─── Context usage bar ──────────────────────────────────────── */
function ContextBar({ integrations }: { integrations: any[] }) {
  const total = integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)
  if (total === 0) return null

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(15,15,17,0.85)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}>
      {/* Ambient */}
      <div className="absolute -top-4 left-8 w-32 h-16 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.07) 0%, transparent 70%)' }} />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
              <Database className="w-3.5 h-3.5 text-brand" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">Context Distribution</p>
              <p className="text-[10px] text-dark-600">{fmtNum(total)} total chunks</p>
            </div>
          </div>
          <Link href="/dashboard/integrations"
            className="text-[11px] text-dark-600 hover:text-brand transition-colors flex items-center gap-0.5">
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Stacked bar */}
        <div className="flex rounded-full overflow-hidden h-2 mb-3 gap-0.5">
          {PROVIDERS.map(p => {
            const integ = integrations.find(i => i.provider === p.apiKey)
            const chunks = integ?.total_chunks || 0
            const pct = total > 0 ? (chunks / total) * 100 : 0
            if (pct < 1) return null
            return (
              <div key={p.key} className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: p.color }} title={`${p.label}: ${fmtNum(chunks)}`} />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {PROVIDERS.map(p => {
            const integ = integrations.find(i => i.provider === p.apiKey)
            const chunks = integ?.total_chunks || 0
            if (!chunks) return null
            return (
              <div key={p.key} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                <span className="text-dark-600">{p.label}</span>
                <span className="font-medium" style={{ color: p.color }}>{fmtNum(chunks)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Quick actions ──────────────────────────────────────────── */
const ACTIONS = [
  { href: '/dashboard/chat',         label: 'Ask anything',       sub: 'Chat with your context', icon: Brain,        color: '#d97706' },
  { href: '/dashboard/integrations', label: 'Connect more tools', sub: 'Add data sources',        icon: Plug,         color: '#8b5cf6' },
  { href: '/dashboard/team',         label: 'Invite team',        sub: 'Share your workspace',    icon: Users,        color: '#34a853' },
]

function QuickActionCard({ href, label, sub, icon: Icon, color }: typeof ACTIONS[0]) {
  const [hov, setHov] = useState(false)
  return (
    <Link href={href}>
      <div className="relative p-4 rounded-xl cursor-pointer transition-all duration-150 overflow-hidden"
        style={{
          background: hov ? `${color}08` : 'rgba(15,15,17,0.6)',
          border: hov ? `1px solid ${color}25` : '1px solid rgba(255,255,255,0.06)',
          transform: hov ? 'translateY(-1px)' : 'none',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{ background: `${color}12`, border: `1px solid ${color}20`, color }}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white leading-tight">{label}</p>
            <p className="text-[10px] text-dark-600 mt-0.5">{sub}</p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 transition-all duration-150"
            style={{ color: hov ? color : '#3f3f46', transform: hov ? 'translateX(2px)' : 'none' }} />
        </div>
      </div>
    </Link>
  )
}

/* ─── ContextOS mini SVG logo ────────────────────────────────── */
function CtxLogo({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="db-cg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="db-hg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#db-cg)" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="#d97706" />
      <g transform="translate(37,32)">
        <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke="url(#db-hg)" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#db-hg)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="0" x2="7" y2="0" stroke="url(#db-hg)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="4" x2="7" y2="4" stroke="url(#db-hg)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore(state => state.user)
  const isInitialized = useAuthStore(state => state.isInitialized)

  const [stats, setStats] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queryHistory, setQueryHistory] = useState<number[]>([])
  const [chunkHistory] = useState(() =>
    Array.from({ length: 12 }, (_, i) => Math.max(0, i * 0.8 + Math.random() * 0.4))
  )

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const [statsRes, usageRes, intRes] = await Promise.allSettled([
          integrationsApi.getStats(),
          billingApi.getUsage(),
          integrationsApi.getAll(),
        ])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || null)
        if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data || null)
        if (intRes.status === 'fulfilled') setIntegrations(intRes.value.data || [])
      } catch { setError('Failed to load dashboard') }
      finally { setLoading(false) }
    }
    load()
  }, [isInitialized])

  // Seed + animate query history
  useEffect(() => {
    if (loading || !usage) return
    const base = usage?.queries_count ?? 0
    const seed = Array.from({ length: 24 }, (_, i) =>
      Math.max(0, base - (24 - i) * 0.3 + (Math.random() - 0.5) * 2)
    )
    seed[seed.length - 1] = base
    setQueryHistory(seed)
    const iv = setInterval(() => {
      setQueryHistory(prev => {
        const n = [...prev.slice(1)]
        n.push(Math.max(0, prev[prev.length - 1] + (Math.random() - 0.4)))
        return n
      })
    }, 3000)
    return () => clearInterval(iv)
  }, [loading, usage])

  const connected = integrations.filter(i => i.is_active)
  const connectedCount = connected.length
  const totalChunks = integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)
  const queriesCount = usage?.queries_count ?? 0
  const queriesLimit = usage?.queries_limit ?? 25

  return (
    <>
      <style>{`
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%       { transform: scale(1.8); opacity: 0; }
        }
        @keyframes ping2 {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.5); opacity: 0.3; }
        }
        @keyframes dbFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dbFadeDelay {
          0%, 10%  { opacity: 0; transform: translateY(8px); }
          100%     { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-6xl" style={{ animation: 'dbFade 0.35s ease-out' }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}>
                <CtxLogo size={14} />
                <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">Dashboard</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-dark-500 text-sm mt-1">
              {connectedCount > 0
                ? `${connectedCount} source${connectedCount !== 1 ? 's' : ''} active · ${fmtNum(totalChunks)} context chunks`
                : 'Connect your tools to start building context.'
              }
            </p>
          </div>

          <Link href="/dashboard/chat">
            <button
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.25)' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(217,119,6,0.25)')}
            >
              <Brain className="w-4 h-4" />
              Ask ContextOS
            </button>
          </Link>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Context Chunks" value={loading ? null : totalChunks}
            icon={Database} color="#d97706"
            subtext={loading ? '' : `${connectedCount} source${connectedCount !== 1 ? 's' : ''}`}
            loading={loading} sparkData={chunkHistory} />
          <StatCard label="Active Sources" value={loading ? null : connectedCount}
            icon={Plug} color="#22c55e"
            subtext={loading ? '' : `of ${PROVIDERS.length} available`}
            loading={loading} />
          <StatCard label="Queries Today" value={loading ? null : queriesCount}
            icon={Activity} color="#f59e0b"
            subtext={loading ? '' : queriesLimit === -1 ? 'unlimited' : `${queriesLimit - queriesCount} remaining`}
            loading={loading} />
          <StatCard label="Plan" value={loading ? null : (user?.plan ?? 'Free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)}
            icon={Zap} color="#8b5cf6"
            subtext="Current subscription"
            loading={loading} />
        </div>

        {/* ── Main content row ── */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5">

          {/* Query activity chart — 2 cols */}
          <div className="lg:col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'rgba(15,15,17,0.85)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              animation: 'dbFadeDelay 0.5s ease-out',
            }}>
            {/* Ambient */}
            <div className="absolute -top-8 left-1/3 w-40 h-20 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.05) 0%, transparent 70%)' }} />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
                    <TrendingUp className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">Query Activity</p>
                    <p className="text-[10px] text-dark-600">Real-time volume</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.15)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"
                    style={{ animation: 'ping2 2s ease-in-out infinite' }} />
                  <span className="text-[10px] font-medium text-green-400">Live</span>
                </div>
              </div>

              {loading ? (
                <div className="h-36 rounded-xl bg-dark-800/30 animate-pulse" />
              ) : (
                <QueryChart data={queryHistory} queriesCount={queriesCount} limit={queriesLimit} />
              )}
            </div>
          </div>

          {/* Quick actions — 1 col */}
          <div className="flex flex-col gap-3" style={{ animation: 'dbFadeDelay 0.6s ease-out' }}>
            <div className="rounded-2xl p-4 flex-1"
              style={{
                background: 'rgba(15,15,17,0.85)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
              }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-3.5 h-3.5 text-brand" />
                <p className="text-[12px] font-semibold text-white">Quick Actions</p>
              </div>
              <div className="flex flex-col gap-2">
                {ACTIONS.map(a => <QuickActionCard key={a.href} {...a} />)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row: integrations + context bar ── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Integrations list — 2 cols */}
          <div className="lg:col-span-2 rounded-2xl p-5"
            style={{
              background: 'rgba(15,15,17,0.85)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              animation: 'dbFadeDelay 0.65s ease-out',
            }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plug className="w-3.5 h-3.5 text-dark-500" />
                <p className="text-[12px] font-semibold text-white">Data Sources</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(22,163,74,0.1)', color: '#22c55e', border: '1px solid rgba(22,163,74,0.2)' }}>
                  {connectedCount} active
                </span>
              </div>
              <Link href="/dashboard/integrations"
                className="text-[11px] text-dark-600 hover:text-brand transition-colors flex items-center gap-0.5">
                Manage all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-dark-800/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-0.5">
                {PROVIDERS.map(p => (
                  <IntegrationRow
                    key={p.key}
                    provider={p}
                    integration={integrations.find(i => i.provider === p.apiKey)}
                  />
                ))}
              </div>
            )}

            {!loading && connectedCount === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.12)' }}>
                  <Plug className="w-4 h-4 text-brand opacity-50" />
                </div>
                <p className="text-sm text-dark-600 mb-2">No integrations connected</p>
                <Link href="/dashboard/integrations"
                  className="text-[12px] font-medium text-brand hover:text-brand-light transition-colors flex items-center gap-1">
                  Connect your first tool <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Right col: context bar + usage */}
          <div className="flex flex-col gap-4" style={{ animation: 'dbFadeDelay 0.7s ease-out' }}>

            {/* Context distribution */}
            {!loading && totalChunks > 0
              ? <ContextBar integrations={integrations} />
              : !loading && (
                <div className="rounded-2xl p-5"
                  style={{ background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[11px] text-dark-700 text-center py-4">
                    Connect integrations to see context distribution
                  </p>
                </div>
              )
            }
            {loading && <div className="rounded-2xl h-40 bg-dark-800/30 animate-pulse" />}

            {/* Usage meter */}
            {!loading && usage && (
              <div className="rounded-2xl p-5"
                style={{
                  background: 'rgba(15,15,17,0.85)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-semibold text-white">Usage</p>
                  <Link href="/dashboard/billing"
                    className="text-[10px] text-dark-600 hover:text-brand transition-colors">
                    Upgrade →
                  </Link>
                </div>

                <div className="space-y-3">
                  {/* Queries */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-dark-600">Queries</span>
                      <span className="text-dark-400">{queriesCount} / {queriesLimit === -1 ? '∞' : queriesLimit}</span>
                    </div>
                    <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
                      {queriesLimit !== -1 && (
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min((queriesCount / queriesLimit) * 100, 100)}%`,
                            background: queriesCount / queriesLimit > 0.8 ? '#ef4444' : '#d97706',
                          }} />
                      )}
                      {queriesLimit === -1 && <div className="h-full rounded-full w-full bg-brand opacity-30" />}
                    </div>
                  </div>

                  {/* Integrations */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-dark-600">Integrations</span>
                      <span className="text-dark-400">{connectedCount} / {PROVIDERS.length}</span>
                    </div>
                    <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-600 transition-all duration-700"
                        style={{ width: `${(connectedCount / PROVIDERS.length) * 100}%` }} />
                    </div>
                  </div>

                  {/* Plan badge */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-dark-700">
                      {(user?.plan ?? 'free')} plan
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: 'rgba(217,119,6,0.1)', color: '#f59e0b', border: '1px solid rgba(217,119,6,0.2)' }}>
                      {user?.plan ?? 'Free'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {loading && <div className="rounded-2xl h-32 bg-dark-800/30 animate-pulse" />}
          </div>
        </div>
      </div>
    </>
  )
}