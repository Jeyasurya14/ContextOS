'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Database, Plug, Activity, TrendingUp, Users,
  Zap, Clock, Brain, GitCommit, FileText, Hash,
  ArrowRight, ChevronRight, Layers, Globe, CheckCircle2
} from 'lucide-react'
import { integrationsApi, billingApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/* ─── Helpers ───────────────────────────────────────────────── */
function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

/* ─── Providers ──────────────────────────────────────────────── */
const PROVIDERS = [
  { key: 'github',  apiKey: 'github',      label: 'GitHub',       icon: GitCommit, color: '#a78bfa' },
  { key: 'notion',  apiKey: 'notion',      label: 'Notion',       icon: FileText,  color: '#e2e8f0' },
  { key: 'slack',   apiKey: 'slack',       label: 'Slack',        icon: Hash,      color: '#f87171' },
  { key: 'linear',  apiKey: 'linear',      label: 'Linear',       icon: Layers,    color: '#67e8f9' },
  { key: 'google',  apiKey: 'google_drive',label: 'Google Drive', icon: Globe,     color: '#86efac' },
]

/* ─── Sparkline ──────────────────────────────────────────────── */
function Sparkline({ data, height = 32 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null
  const W = 100, H = height
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (v / max) * (H - 4) - 2,
  }))
  const d = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`
    const prev = pts[i - 1]
    return `${acc} C${prev.x + (pt.x - prev.x) / 2},${prev.y} ${pt.x - (pt.x - prev.x) / 2},${pt.y} ${pt.x},${pt.y}`
  }, '')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spLine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#spLine)" />
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Query Chart ────────────────────────────────────────────── */
function QueryChartArea({ data, limit, count }: { data: number[], limit: number, count: number }) {
  if (data.length === 0) {
    return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>Waiting for data…</div>
  }

  const W = 600, H = 160
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (v / max) * (H - 16) - 8,
  }))
  const line = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`
    const prev = pts[i - 1]
    return `${acc} C${prev.x + (pt.x - prev.x) / 3},${prev.y} ${pt.x - (pt.x - prev.x) / 3},${pt.y} ${pt.x},${pt.y}`
  }, '')
  const fill = `${line} L${W},${H} L0,${H} Z`
  const last = pts[pts.length - 1]
  const pct = limit > 0 && limit !== -1 ? (count / limit) * 100 : null

  return (
    <div>
      <div style={{ position: 'relative', height: 160, marginBottom: 16 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="qcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[1/3, 2/3].map(f => (
            <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="var(--border-base)" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          <path d={fill} fill="url(#qcGrad)" className="anim-fade-in" />
          <path d={line} fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" className="anim-fade-in" />
          {/* Current point */}
          <circle cx={last.x} cy={last.y} r="4" fill="var(--brand)" stroke="var(--bg-surface)" strokeWidth="2" />
        </svg>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 16, borderTop: '1px solid var(--border-subtle)',
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Today: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{count} queries</span>
          </div>
          {limit !== -1 && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Limit check: </span>
              <span style={{ color: pct && pct > 80 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                {limit - count} remaining
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'dot-pulse 2s infinite' }} />
          <span style={{ color: 'var(--success-text)', fontWeight: 500 }}>Live Data</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const isInitialized = useAuthStore(s => s.isInitialized)

  const [usage, setUsage] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [queryData, setQueryData] = useState<number[]>([])
  const [chunkData] = useState(() => Array.from({ length: 12 }, (_, i) => Math.max(0, i * 2 + Math.random() * 5)))

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    ;(async () => {
      setLoading(true)
      try {
        const [uRes, iRes] = await Promise.allSettled([billingApi.getUsage(), integrationsApi.getAll()])
        if (uRes.status === 'fulfilled') setUsage(uRes.value.data)
        if (iRes.status === 'fulfilled') setIntegrations(iRes.value.data || [])
      } finally { setLoading(false) }
    })()
  }, [isInitialized])

  // Mock live chart data
  useEffect(() => {
    if (loading || !usage) return
    const count = usage?.queries_count ?? 0
    let series = Array.from({ length: 24 }, (_, i) => Math.max(0, count - (24 - i) * 1.5 + (Math.random() - 0.5) * 3))
    series[series.length - 1] = count
    setQueryData(series)

    const iv = setInterval(() => {
      setQueryData(prev => {
        const next = [...prev.slice(1)]
        next.push(Math.max(0, prev[prev.length - 1] + (Math.random() - 0.3) * 2))
        return next
      })
    }, 4000)
    return () => clearInterval(iv)
  }, [loading, usage])

  const activeCount = integrations.filter(i => i.is_active).length
  const totalChunks = integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)
  const qCount = usage?.queries_count ?? 0
  const qLim = usage?.queries_limit ?? 50
  const planName = (user?.plan ?? 'free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)' }}>
            Here's what's happening in your workspace today.
          </p>
        </div>
        <Link href="/dashboard/chat">
          <button className="btn btn-primary btn-md">
            <Brain style={{ width: 15, height: 15 }} />
            Ask ContextOS
          </button>
        </Link>
      </div>

      {/* ── METRICS GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>

        {/* Card 1: Chunks */}
        <div className="card-raised" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Indexed Chunks</span>
            <Database style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
          </div>
          {loading ? <div className="skel" style={{ height: 32, width: 80, marginTop: 4 }} /> : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {fmt(totalChunks)}
              </span>
              <div style={{ width: 60, height: 20, marginBottom: 2 }}><Sparkline data={chunkData} height={20} /></div>
            </div>
          )}
        </div>

        {/* Card 2: Sources */}
        <div className="card-raised" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Active Sources</span>
            <Plug style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
          </div>
          {loading ? <div className="skel" style={{ height: 32, width: 80, marginTop: 4 }} /> : (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {activeCount} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: 'normal' }}>/ {PROVIDERS.length}</span>
              </span>
            </div>
          )}
        </div>

        {/* Card 3: Queries */}
        <div className="card-raised" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Queries Today</span>
            <Activity style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
          </div>
          {loading ? <div className="skel" style={{ height: 32, width: 80, marginTop: 4 }} /> : (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {qCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CHARTS & ACTIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="lg:grid-cols-3">

        {/* Left: Chart */}
        <div className="card lg:col-span-2" style={{ padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Query Volume</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Activity across your team over the last 24 hours.</p>
          </div>
          {loading ? <div className="skel" style={{ height: 200 }} /> : (
            <QueryChartArea data={queryData} limit={qLim} count={qCount} />
          )}
        </div>

        {/* Right: Quick actions */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/dashboard/chat', icon: Brain, label: 'Chat with Workspace', sub: 'Run a new query' },
              { href: '/dashboard/integrations', icon: Plug, label: 'Add Data Source', sub: 'Connect GitHub, Notion, etc' },
              { href: '/dashboard/team', icon: Users, label: 'Invite Team', sub: 'Collaborate on context' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-subtle)',
                  transition: 'border var(--t-fast), background var(--t-fast)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-raised)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <a.icon style={{ width: 14, height: 14, color: 'var(--text-primary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{a.sub}</div>
                  </div>
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
                </div>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <div style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Zap style={{ width: 12, height: 12, color: 'var(--brand)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-text)' }}>ContextOS Starter</span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                You are currently on the free plan. Upgrade to unlock unlimited queries and team members.
              </p>
              <Link href="/dashboard/billing">
                <button className="btn btn-sm" style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}>
                  View Plans
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTEGRATIONS ── */}
      <div>
        <div className="card">
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Data Integrations</h3>
            <Link href="/dashboard/integrations" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
              Manage →
            </Link>
          </div>
          <div>
            {loading ? (
              <div style={{ padding: '24px' }}>
                <div className="skel" style={{ height: 48, marginBottom: 8 }} />
                <div className="skel" style={{ height: 48, marginBottom: 8 }} />
                <div className="skel" style={{ height: 48 }} />
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1,
                background: 'var(--border-subtle)', // Creates 1px borders between items
              }}>
                {PROVIDERS.map(p => {
                  const intg = integrations.find(i => i.provider === p.apiKey)
                  const isActive = intg?.is_active
                  return (
                    <div key={p.key} style={{
                      padding: '16px 24px', background: 'var(--bg-surface)',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p.icon style={{ width: 16, height: 16, color: isActive ? p.color : 'var(--text-tertiary)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                          {isActive ? (intg.total_chunks ? `${fmt(intg.total_chunks)} chunks` : 'Connected') : 'Not connected'}
                        </div>
                      </div>
                      {isActive ? (
                        <span className="badge badge-green">Active</span>
                      ) : (
                        <span className="badge badge-neutral">Connect</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}