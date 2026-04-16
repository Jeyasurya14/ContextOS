// frontend/src/app/dashboard/page.tsx
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Database, Plug, MessageSquare, TrendingUp, Users, ArrowUpRight,
  Sparkles, Activity, ChevronRight, Zap, Clock, Brain, GitCommit,
  FileText, Hash, AlertCircle, ArrowRight, Layers, RefreshCw,
  Command, Star, BarChart3, Globe,
} from 'lucide-react'
import { integrationsApi, billingApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/* ─── Helpers ─────────────────────────────────────────────────── */
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

/* ─── PROVIDERS ──────────────────────────────────────────────── */
const PROVIDERS = [
  { key: 'github',  apiKey: 'github',       label: 'GitHub',       color: '#a78bfa', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)', icon: GitCommit },
  { key: 'notion',  apiKey: 'notion',        label: 'Notion',       color: '#e4e4e7', gradient: 'linear-gradient(135deg,#52525b,#a0a0a8)', icon: FileText  },
  { key: 'slack',   apiKey: 'slack',         label: 'Slack',        color: '#fb7185', gradient: 'linear-gradient(135deg,#e11d48,#fb7185)', icon: Hash      },
  { key: 'linear',  apiKey: 'linear',        label: 'Linear',       color: '#67e8f9', gradient: 'linear-gradient(135deg,#0891b2,#22d3ee)', icon: Layers    },
  { key: 'google',  apiKey: 'google_drive',  label: 'Google Drive', color: '#6ee7b7', gradient: 'linear-gradient(135deg,#059669,#34d399)', icon: Globe     },
]

/* ─── Animated Counter ────────────────────────────────────────── */
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

/* ─── Sparkline ──────────────────────────────────────────────── */
function Sparkline({ data, color = '#f59e0b', height = 48 }: { data: number[]; color?: string; height?: number }) {
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
  const gradId = `sg${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="3.5" fill={color} opacity="0.4"
        style={{ animation: 'pingDot 2s ease-in-out infinite' }} />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  )
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, color, trend, loading, sparkData }: {
  label: string; value: number | string | null; sub?: string
  icon: any; color: string; trend?: number; loading?: boolean; sparkData?: number[]
}) {
  return (
    <div className="stat-card" style={{ cursor: 'default', animation: 'dbFade 0.4s ease-out both' }}>
      {/* Top corner glow */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 100, height: 100,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${color}15`, border: `1px solid ${color}28`,
            boxShadow: `0 0 12px ${color}10`,
          }}>
            <Icon style={{ width: 17, height: 17, color }} />
          </div>
          {trend !== undefined && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
              color: trend >= 0 ? '#34d399' : '#fb7185',
              border: `1px solid ${trend >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ height: 28, width: 80, borderRadius: 8, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 4 }} />
        ) : (
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
            {typeof value === 'number' ? <AnimatedNumber target={value} /> : value}
          </div>
        )}
        <p style={{ fontSize: 11, color: 'rgba(120,120,150,0.8)', fontWeight: 600, letterSpacing: '0.02em' }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: 'rgba(90,90,115,0.7)', marginTop: 2 }}>{sub}</p>}
      </div>

      {sparkData && sparkData.length > 1 && (
        <div style={{ padding: '8px 16px 12px', marginTop: -4 }}>
          <Sparkline data={sparkData} color={color} height={38} />
        </div>
      )}
    </div>
  )
}

/* ─── Query Activity Chart ────────────────────────────────────── */
function QueryChart({ data, queriesCount, limit }: { data: number[]; queriesCount: number; limit: number }) {
  if (data.length === 0) return (
    <div style={{
      height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(100,100,130,0.6)', fontSize: 13, flexDirection: 'column', gap: 8,
    }}>
      <BarChart3 style={{ width: 24, height: 24, opacity: 0.3 }} />
      Waiting for query data…
    </div>
  )

  const W = 600, H = 140
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: 10 + (i / (data.length - 1)) * (W - 20),
    y: 10 + (H - 20) - (v / max) * (H - 24),
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="qFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="qLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={10} y1={10 + (H-20)*f} x2={W-10} y2={10 + (H-20)*f}
            stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
        ))}
        <path d={fill} fill="url(#qFill)" />
        <path d={line} fill="none" stroke="url(#qLine)" strokeWidth="2" strokeLinecap="round" filter="url(#lineGlow)" />
        <circle cx={last.x} cy={last.y} r="7" fill="rgba(245,158,11,0.15)"
          style={{ animation: 'pingDot 2s ease-in-out infinite' }} />
        <circle cx={last.x} cy={last.y} r="3.5" fill="#f59e0b" stroke="rgba(8,8,18,0.8)" strokeWidth="1.5" />
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {[
            { dot: '#f59e0b', label: 'Today', val: queriesCount },
            { dot: 'rgba(90,90,115,0.8)', label: 'Limit', val: limit === -1 ? '∞' : limit },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.dot }} />
              <span style={{ color: 'rgba(120,120,150,0.7)' }}>{item.label}:</span>
              <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{item.val}</span>
            </div>
          ))}
        </div>
        {pct !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 80, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, transition: 'width 0.8s ease-out',
                width: `${Math.min(pct, 100)}%`,
                background: pct > 80 ? '#f43f5e' : pct > 60 ? '#f59e0b' : 'linear-gradient(90deg,#d97706,#f59e0b)',
              }} />
            </div>
            <span style={{ fontSize: 10, color: 'rgba(120,120,150,0.7)', fontWeight: 600 }}>{pct}%</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(16,185,129,0.7)' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
          Live
        </div>
      </div>
    </div>
  )
}

/* ─── Integration card ────────────────────────────────────────── */
function IntegrationCard({ provider, integration }: { provider: typeof PROVIDERS[0]; integration: any }) {
  const connected = integration?.is_active === true
  const chunks = integration?.total_chunks ?? 0
  const lastSync = integration?.last_synced_at
  const Icon = provider.icon

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 14,
      background: connected ? `${provider.color}07` : 'transparent',
      border: `1px solid ${connected ? provider.color + '18' : 'rgba(255,255,255,0.04)'}`,
      transition: 'all 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = connected ? `${provider.color}12` : 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = connected ? `${provider.color}28` : 'rgba(255,255,255,0.07)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = connected ? `${provider.color}07` : 'transparent'
        e.currentTarget.style.borderColor = connected ? `${provider.color}18` : 'rgba(255,255,255,0.04)'
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        background: connected ? `${provider.color}15` : 'rgba(26,26,40,0.8)',
        border: `1px solid ${connected ? provider.color + '28' : 'rgba(255,255,255,0.06)'}`,
      }}>
        <Icon style={{ width: 15, height: 15, color: connected ? provider.color : 'rgba(90,90,115,0.7)' }} />
        {connected && (
          <div style={{
            position: 'absolute', bottom: -3, right: -3,
            width: 9, height: 9, borderRadius: '50%',
            background: '#10b981', border: '2px solid rgb(8,8,18)',
            boxShadow: '0 0 6px #10b981',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: connected ? 'rgba(230,230,250,0.9)' : 'rgba(80,80,100,0.8)' }}>
            {provider.label}
          </span>
          {connected && chunks > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: provider.color }}>{fmtNum(chunks)}</span>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'rgba(100,100,130,0.7)' }}>
          {connected ? (lastSync ? relTime(lastSync) : 'Connected') : 'Not connected'}
        </span>
      </div>

      {connected && (
        <div style={{ flexShrink: 0, width: 50, height: 20, overflow: 'hidden' }}>
          <Sparkline data={[0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.7, 1]} color={provider.color} height={20} />
        </div>
      )}
    </div>
  )
}

/* ─── Quick actions ──────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { href: '/dashboard/chat',         label: 'Ask ContextOS',     sub: 'Chat with your full context',     icon: Brain,    color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)' },
  { href: '/dashboard/integrations', label: 'Add integrations',  sub: 'Connect data sources',             icon: Plug,     color: '#8b5cf6', gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  { href: '/dashboard/team',         label: 'Invite teammates',  sub: 'Share workspace access',           icon: Users,    color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
]

function QuickActionCard({ href, label, sub, icon: Icon, color, gradient }: typeof QUICK_ACTIONS[0]) {
  return (
    <Link href={href}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14,
        background: 'rgba(255,255,255,0)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative', overflow: 'hidden',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `${color}09`
          e.currentTarget.style.borderColor = `${color}22`
          e.currentTarget.style.transform = 'translateX(3px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.transform = 'translateX(0)'
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${color}15`,
          border: `1px solid ${color}25`,
          boxShadow: `0 0 12px ${color}12`,
        }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(220,220,240,0.9)', margin: 0, letterSpacing: '-0.01em' }}>{label}</p>
          <p style={{ fontSize: 10, color: 'rgba(110,110,140,0.75)', margin: '2px 0 0' }}>{sub}</p>
        </div>
        <ArrowRight style={{ width: 14, height: 14, color: `${color}70`, flexShrink: 0 }} />
      </div>
    </Link>
  )
}

/* ─── Context Distribution Bar ───────────────────────────────── */
function ContextBar({ integrations }: { integrations: any[] }) {
  const total = integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)
  if (total === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <Database style={{ width: 13, height: 13, color: '#f59e0b' }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(220,220,240,0.9)', margin: 0 }}>Context Distribution</p>
            <p style={{ fontSize: 10, color: 'rgba(100,100,130,0.7)', margin: 0 }}>{fmtNum(total)} total chunks</p>
          </div>
        </div>
        <Link href="/dashboard/integrations">
          <span style={{ fontSize: 11, color: 'rgba(100,100,130,0.7)', display: 'flex', alignItems: 'center', gap: 3, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,100,130,0.7)')}>
            Manage <ChevronRight style={{ width: 12, height: 12 }} />
          </span>
        </Link>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', borderRadius: 99, overflow: 'hidden', height: 6, gap: 2, marginBottom: 10 }}>
        {PROVIDERS.map(p => {
          const integ = integrations.find(i => i.provider === p.apiKey)
          const chunks = integ?.total_chunks || 0
          const pct = total > 0 ? (chunks / total) * 100 : 0
          if (pct < 1) return null
          return (
            <div key={p.key} style={{
              height: '100%', borderRadius: 99, transition: 'width 0.8s ease-out',
              width: `${pct}%`, background: p.gradient,
              boxShadow: `0 0 8px ${p.color}30`,
            }} title={`${p.label}: ${fmtNum(chunks)}`} />
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {PROVIDERS.map(p => {
          const integ = integrations.find(i => i.provider === p.apiKey)
          const chunks = integ?.total_chunks || 0
          if (!chunks) return null
          return (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, boxShadow: `0 0 4px ${p.color}` }} />
              <span style={{ color: 'rgba(110,110,140,0.75)' }}>{p.label}</span>
              <span style={{ fontWeight: 700, color: p.color }}>{fmtNum(chunks)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Dashboard Page ─────────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore(state => state.user)
  const isInitialized = useAuthStore(state => state.isInitialized)

  const [stats, setStats] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [queryHistory, setQueryHistory] = useState<number[]>([])
  const [chunkHistory] = useState(() =>
    Array.from({ length: 16 }, (_, i) => Math.max(0, i * 0.7 + Math.random() * 0.5))
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
      setLoading(true)
      try {
        const [statsRes, usageRes, intRes] = await Promise.allSettled([
          integrationsApi.getStats(),
          billingApi.getUsage(),
          integrationsApi.getAll(),
        ])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || null)
        if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data || null)
        if (intRes.status === 'fulfilled') setIntegrations(intRes.value.data || [])
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [isInitialized])

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

  const STATS = [
    {
      label: 'Context Chunks', value: loading ? null : totalChunks,
      sub: loading ? '' : `${connectedCount} source${connectedCount !== 1 ? 's' : ''} active`,
      icon: Database, color: '#f59e0b', sparkData: chunkHistory,
    },
    {
      label: 'Active Sources', value: loading ? null : connectedCount,
      sub: loading ? '' : `of ${PROVIDERS.length} available`,
      icon: Plug, color: '#10b981',
    },
    {
      label: 'Queries Today', value: loading ? null : queriesCount,
      sub: loading ? '' : queriesLimit === -1 ? 'unlimited' : `${Math.max(0, queriesLimit - queriesCount)} remaining`,
      icon: Activity, color: '#8b5cf6',
    },
    {
      label: 'Plan', value: loading ? null : (user?.plan ?? 'Free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1),
      sub: 'Current subscription',
      icon: Zap, color: '#06b6d4',
    },
  ]

  return (
    <>
      <style>{`
        @keyframes pingDot { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(2);opacity:0} }
        @keyframes dbFade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        .dash-fade-1 { animation: dbFade 0.4s ease-out both; }
        .dash-fade-2 { animation: dbFade 0.5s ease-out 0.08s both; }
        .dash-fade-3 { animation: dbFade 0.5s ease-out 0.16s both; }
        .dash-fade-4 { animation: dbFade 0.5s ease-out 0.24s both; }
      `}</style>

      <div style={{ maxWidth: 1200 }}>

        {/* ── Header ── */}
        <div className="dash-fade-1" style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 99,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.18)',
              marginBottom: 10,
            }}>
              <Sparkles style={{ width: 12, height: 12, color: '#f59e0b' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Dashboard
              </span>
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: '#fff',
              letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 6px',
              fontFamily: 'Inter, sans-serif',
            }}>
              {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(120,120,150,0.85)', margin: 0 }}>
              {connectedCount > 0
                ? `${connectedCount} source${connectedCount !== 1 ? 's' : ''} active · ${fmtNum(totalChunks)} context chunks indexed`
                : 'Connect your first tool to start building AI context.'
              }
            </p>
          </div>

          <Link href="/dashboard/chat">
            <button style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              letterSpacing: '0.01em', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}>
              <Brain style={{ width: 16, height: 16 }} />
              Ask ContextOS
            </button>
          </Link>
        </div>

        {/* ── Stat cards ── */}
        <div className="dash-fade-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          {STATS.map((s, i) => (
            <StatCard key={s.label} {...s} loading={loading} />
          ))}
        </div>

        {/* ── Main row ── */}
        <div className="dash-fade-3" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gap: 16 }}
            className="lg:grid-cols-3">

            {/* Query chart — 2 col */}
            <div style={{
              gridColumn: 'span 2',
              background: 'linear-gradient(145deg, rgba(18,18,32,0.95), rgba(12,12,22,0.9))',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, padding: 22,
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    <TrendingUp style={{ width: 16, height: 16, color: '#f59e0b' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(220,220,240,0.95)', margin: 0 }}>Query Activity</p>
                    <p style={{ fontSize: 10, color: 'rgba(100,100,130,0.7)', margin: 0 }}>Real-time volume · 24h</p>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 99,
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981', animation: 'pingDot 3s ease-in-out infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', letterSpacing: '0.06em' }}>LIVE</span>
                </div>
              </div>
              {loading ? (
                <div style={{ height: 140, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : (
                <QueryChart data={queryHistory} queriesCount={queriesCount} limit={queriesLimit} />
              )}
            </div>

            {/* Quick actions */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(18,18,32,0.95), rgba(12,12,22,0.9))',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, padding: 20,
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Command style={{ width: 14, height: 14, color: 'rgba(140,140,170,0.7)' }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(200,200,225,0.9)', margin: 0, letterSpacing: '-0.01em' }}>Quick Actions</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {QUICK_ACTIONS.map(a => <QuickActionCard key={a.href} {...a} />)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="dash-fade-4" style={{ display: 'grid', gap: 16 }}
          >
          <div style={{ display: 'grid', gap: 16 }} className="lg:grid-cols-3">

            {/* Integrations — 2 col */}
            <div style={{
              gridColumn: 'span 2',
              background: 'linear-gradient(145deg, rgba(18,18,32,0.95), rgba(12,12,22,0.9))',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, padding: 20,
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plug style={{ width: 13, height: 13, color: 'rgba(140,140,170,0.7)' }} />
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(200,200,225,0.9)', margin: 0 }}>Data Sources</p>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 99,
                    background: connectedCount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                    color: connectedCount > 0 ? '#34d399' : 'rgba(120,120,150,0.7)',
                    border: `1px solid ${connectedCount > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                    {connectedCount} active
                  </span>
                </div>
                <Link href="/dashboard/integrations">
                  <span style={{ fontSize: 11, color: 'rgba(100,100,130,0.7)', display: 'flex', alignItems: 'center', gap: 3, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,100,130,0.7)')}>
                    Manage <ChevronRight style={{ width: 12, height: 12 }} />
                  </span>
                </Link>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ height: 54, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {PROVIDERS.map(p => (
                    <IntegrationCard
                      key={p.key}
                      provider={p}
                      integration={integrations.find(i => i.provider === p.apiKey)}
                    />
                  ))}
                </div>
              )}

              {!loading && connectedCount === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, margin: '0 auto 12px',
                    background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plug style={{ width: 18, height: 18, color: 'rgba(245,158,11,0.5)' }} />
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(100,100,130,0.7)', marginBottom: 8 }}>No integrations connected yet</p>
                  <Link href="/dashboard/integrations">
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fbbf24')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#f59e0b')}>
                      Connect your first tool <ArrowRight style={{ width: 12, height: 12 }} />
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Right col: context + usage */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Context distribution */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(18,18,32,0.95), rgba(12,12,22,0.9))',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: 20,
                backdropFilter: 'blur(24px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                {loading ? (
                  <div style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ) : totalChunks > 0 ? (
                  <ContextBar integrations={integrations} />
                ) : (
                  <p style={{ fontSize: 11, color: 'rgba(90,90,115,0.6)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                    Connect integrations to see context distribution
                  </p>
                )}
              </div>

              {/* Usage meter */}
              {!loading && usage && (
                <div style={{
                  background: 'linear-gradient(145deg, rgba(18,18,32,0.95), rgba(12,12,22,0.9))',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, padding: 20, flex: 1,
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(200,200,225,0.9)', margin: 0 }}>Usage</p>
                    <Link href="/dashboard/billing">
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#fbbf24')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#f59e0b')}>
                        Upgrade plan →
                      </span>
                    </Link>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Queries */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'rgba(110,110,140,0.75)' }}>Queries</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(190,190,220,0.8)' }}>
                          {queriesCount} / {queriesLimit === -1 ? '∞' : queriesLimit}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        {queriesLimit !== -1 && (
                          <div style={{
                            height: '100%', borderRadius: 99, transition: 'width 0.8s ease-out',
                            width: `${Math.min((queriesCount / queriesLimit) * 100, 100)}%`,
                            background: queriesCount / queriesLimit > 0.8 ? 'linear-gradient(90deg,#e11d48,#f43f5e)' : 'linear-gradient(90deg,#d97706,#f59e0b)',
                            boxShadow: `0 0 6px ${queriesCount / queriesLimit > 0.8 ? 'rgba(244,63,94,0.4)' : 'rgba(245,158,11,0.4)'}`,
                          }} />
                        )}
                        {queriesLimit === -1 && (
                          <div style={{ height: '100%', width: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#059669,#10b981)', opacity: 0.5 }} />
                        )}
                      </div>
                    </div>

                    {/* Integrations */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'rgba(110,110,140,0.75)' }}>Integrations</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(190,190,220,0.8)' }}>
                          {connectedCount} / {PROVIDERS.length}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99, transition: 'width 0.8s ease-out',
                          width: `${(connectedCount / PROVIDERS.length) * 100}%`,
                          background: 'linear-gradient(90deg,#059669,#10b981)',
                          boxShadow: '0 0 6px rgba(16,185,129,0.4)',
                        }} />
                      </div>
                    </div>

                    {/* Plan chip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(100,100,130,0.6)' }}>Current plan</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize',
                        background: 'rgba(245,158,11,0.1)', color: '#fbbf24',
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}>
                        {user?.plan ?? 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {loading && <div style={{ height: 120, borderRadius: 20, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}