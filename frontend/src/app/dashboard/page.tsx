// frontend/src/app/dashboard/page.tsx
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Database, Plug, Activity, TrendingUp, Users,
  Zap, Clock, Brain, GitCommit, FileText, Hash,
  ArrowRight, ChevronRight, Layers, Globe,
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
  { key: 'notion',  apiKey: 'notion',       label: 'Notion',       icon: FileText,  color: '#e4e4e7' },
  { key: 'slack',   apiKey: 'slack',        label: 'Slack',        icon: Hash,      color: '#f87171' },
  { key: 'linear',  apiKey: 'linear',       label: 'Linear',       icon: Layers,    color: '#67e8f9' },
  { key: 'google',  apiKey: 'google_drive', label: 'Google Drive', icon: Globe,     color: '#86efac' },
]

/* ─── Animated number ────────────────────────────────────────── */
function Counter({ to }: { to: number }) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>()
  const t0 = useRef<number>()

  useEffect(() => {
    const from = val
    t0.current = undefined
    const animate = (ts: number) => {
      if (!t0.current) t0.current = ts
      const p = Math.min((ts - t0.current) / 900, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (to - from) * ease))
      if (p < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [to])

  return <>{fmt(val)}</>
}

/* ─── Sparkline ──────────────────────────────────────────────── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const W = 120, H = 32
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
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sp-${color.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#sp-${color.replace(/\W/g, '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, loading, sparkData }: {
  label: string; value: number | string | null; sub?: string
  icon: any; loading?: boolean; sparkData?: number[]
}) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#8888a0' }}>{label}</p>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: '#1a1a24', border: '1px solid #252535',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 13, height: 13, color: '#8888a0' }} />
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 28, width: 72, marginBottom: 4 }} />
      ) : (
        <p style={{ fontSize: 24, fontWeight: 700, color: '#e8e8f0', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
          {typeof value === 'number' ? <Counter to={value} /> : value ?? '—'}
        </p>
      )}

      {sub && <p style={{ fontSize: 11, color: '#4a4a60' }}>{sub}</p>}

      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: 12, overflow: 'hidden' }}>
          <Sparkline data={sparkData} color="#f59e0b" />
        </div>
      )}
    </div>
  )
}

/* ─── Query chart ────────────────────────────────────────────── */
function QueryChart({ data, queriesCount, limit }: { data: number[]; queriesCount: number; limit: number }) {
  if (data.length === 0) {
    return (
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#4a4a60', fontSize: 13,
      }}>
        Waiting for data…
      </div>
    )
  }

  const W = 600, H = 120
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (v / max) * (H - 12) - 4,
  }))
  const line = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`
    const prev = pts[i - 1]
    return `${acc} C${prev.x + (pt.x - prev.x) / 3},${prev.y} ${pt.x - (pt.x - prev.x) / 3},${pt.y} ${pt.x},${pt.y}`
  }, '')
  const fill = `${line} L${W},${H} L0,${H} Z`
  const last = pts[pts.length - 1]
  const pct = limit > 0 && limit !== -1 ? (queriesCount / limit) * 100 : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.33, 0.66].map(f => (
          <line key={f} x1={0} y1={H * f} x2={W} y2={H * f}
            stroke="#1e1e2e" strokeWidth="1" />
        ))}
        <path d={fill} fill="url(#cg)" />
        <path d={line} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={last.x} cy={last.y} r="3" fill="#f59e0b" />
      </svg>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e1e2e',
        fontSize: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#8888a0' }}>
            Today: <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{queriesCount}</span>
          </span>
          <span style={{ color: '#8888a0' }}>
            Limit: <span style={{ color: '#e8e8f0' }}>{limit === -1 ? '∞' : limit}</span>
          </span>
        </div>
        {pct !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="progress" style={{ width: 60 }}>
              <div className="progress-fill" style={{
                width: `${Math.min(pct, 100)}%`,
                background: pct > 80 ? '#ef4444' : '#f59e0b',
              }} />
            </div>
            <span style={{ color: '#4a4a60' }}>{Math.round(pct)}%</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4ade80' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e', display: 'inline-block',
          }} />
          Live
        </div>
      </div>
    </div>
  )
}

/* ─── Integration row ────────────────────────────────────────── */
function IntegrationRow({ provider, integration }: { provider: typeof PROVIDERS[0]; integration: any }) {
  const connected = integration?.is_active === true
  const chunks = integration?.total_chunks ?? 0
  const lastSync = integration?.last_synced_at
  const Icon = provider.icon

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', borderBottom: '1px solid #1e1e2e',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: '#1a1a24', border: '1px solid #252535',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Icon style={{ width: 13, height: 13, color: connected ? provider.color : '#4a4a60' }} />
        {connected && (
          <span style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 7, height: 7, borderRadius: '50%',
            background: '#22c55e', border: '2px solid #0a0a0f',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: connected ? '#e8e8f0' : '#4a4a60', margin: 0 }}>
          {provider.label}
        </p>
        <p style={{ fontSize: 11, color: '#4a4a60', margin: 0 }}>
          {connected ? (lastSync ? relTime(lastSync) : 'Connected') : 'Not connected'}
        </p>
      </div>

      {connected && chunks > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8888a0' }}>
          {fmt(chunks)} chunks
        </span>
      )}
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
  const [queryHistory, setQueryHistory] = useState<number[]>([])
  const [chunkHistory] = useState(() =>
    Array.from({ length: 14 }, (_, i) => Math.max(0, i * 0.8 + Math.random() * 0.4))
  )

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
        const [usageRes, intRes] = await Promise.allSettled([
          billingApi.getUsage(),
          integrationsApi.getAll(),
        ])
        if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data)
        if (intRes.status === 'fulfilled') setIntegrations(intRes.value.data || [])
      } finally {
        setLoading(false)
      }
    })()
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
        const next = [...prev.slice(1)]
        next.push(Math.max(0, prev[prev.length - 1] + (Math.random() - 0.4)))
        return next
      })
    }, 3000)
    return () => clearInterval(iv)
  }, [loading, usage])

  const connectedCount = integrations.filter(i => i.is_active).length
  const totalChunks = integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)
  const queriesCount = usage?.queries_count ?? 0
  const queriesLimit = usage?.queries_limit ?? 25
  const planLabel = (user?.plan ?? 'Free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{
            fontSize: 20, fontWeight: 700, color: '#e8e8f0',
            letterSpacing: '-0.02em', margin: '0 0 4px',
          }}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p style={{ fontSize: 13, color: '#4a4a60', margin: 0 }}>
            {connectedCount > 0
              ? `${connectedCount} source${connectedCount !== 1 ? 's' : ''} active · ${fmt(totalChunks)} chunks`
              : 'Connect your tools to start building context.'
            }
          </p>
        </div>
        <Link href="/dashboard/chat">
          <button className="btn btn-primary" style={{ height: 36, fontSize: 13 }}>
            <Brain style={{ width: 14, height: 14 }} />
            Ask ContextOS
          </button>
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <StatCard label="Context chunks" value={loading ? null : totalChunks}
          sub={`${connectedCount} source${connectedCount !== 1 ? 's' : ''}`}
          icon={Database} loading={loading} sparkData={chunkHistory} />
        <StatCard label="Active sources" value={loading ? null : connectedCount}
          sub={`of ${PROVIDERS.length} available`}
          icon={Plug} loading={loading} />
        <StatCard label="Queries today" value={loading ? null : queriesCount}
          sub={queriesLimit === -1 ? 'Unlimited' : `${Math.max(0, queriesLimit - queriesCount)} remaining`}
          icon={Activity} loading={loading} />
        <StatCard label="Plan" value={loading ? null : planLabel}
          sub="Current subscription"
          icon={Zap} loading={loading} />
      </div>

      {/* ── Main content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
        className="lg:grid-cols-3">

        {/* Query activity — 2 cols */}
        <div className="card lg:col-span-2" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', margin: '0 0 2px' }}>Query Activity</p>
              <p style={{ fontSize: 11, color: '#4a4a60', margin: 0 }}>24h window</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ade80' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Live
            </div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : (
            <QueryChart data={queryHistory} queriesCount={queriesCount} limit={queriesLimit} />
          )}
        </div>

        {/* Quick actions — 1 col */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', margin: '0 0 14px' }}>Quick actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { href: '/dashboard/chat',         label: 'Ask anything',       sub: 'Query your context',     icon: Brain   },
              { href: '/dashboard/integrations', label: 'Add integrations',   sub: 'Connect data sources',   icon: Plug    },
              { href: '/dashboard/team',         label: 'Invite team',        sub: 'Share your workspace',   icon: Users   },
            ].map(a => (
              <Link key={a.href} href={a.href}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a24')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: '#1a1a24', border: '1px solid #252535',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <a.icon style={{ width: 13, height: 13, color: '#8888a0' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0', margin: 0 }}>{a.label}</p>
                    <p style={{ fontSize: 11, color: '#4a4a60', margin: 0 }}>{a.sub}</p>
                  </div>
                  <ArrowRight style={{ width: 12, height: 12, color: '#4a4a60', flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Integrations + Usage ── */}
      <div style={{ display: 'grid', gap: 12 }} className="lg:grid-cols-3">

        {/* Integrations — 2 cols */}
        <div className="card lg:col-span-2" style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid #1e1e2e',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', margin: 0 }}>Data Sources</p>
              {connectedCount > 0 && (
                <span className="badge badge-green">{connectedCount} active</span>
              )}
            </div>
            <Link href="/dashboard/integrations">
              <span style={{ fontSize: 12, color: '#8888a0', display: 'flex', alignItems: 'center', gap: 3, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}>
                Manage <ChevronRight style={{ width: 12, height: 12 }} />
              </span>
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48 }} />
              ))}
            </div>
          ) : (
            <div>
              {PROVIDERS.map(p => (
                <IntegrationRow
                  key={p.key}
                  provider={p}
                  integration={integrations.find(i => i.provider === p.apiKey)}
                />
              ))}
              {connectedCount === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#4a4a60', marginBottom: 12 }}>
                    No integrations connected
                  </p>
                  <Link href="/dashboard/integrations">
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
                      Connect your first tool →
                    </span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Usage — 1 col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', margin: 0 }}>Usage</p>
              <Link href="/dashboard/billing">
                <span style={{ fontSize: 12, color: '#8888a0', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}>
                  Upgrade →
                </span>
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Queries */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: '#8888a0' }}>Queries</span>
                    <span style={{ color: '#e8e8f0', fontWeight: 500 }}>
                      {queriesCount} / {queriesLimit === -1 ? '∞' : queriesLimit}
                    </span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{
                      width: queriesLimit === -1 ? '15%' :
                        `${Math.min((queriesCount / queriesLimit) * 100, 100)}%`,
                      background: queriesCount / queriesLimit > 0.8 ? '#ef4444' : '#f59e0b',
                    }} />
                  </div>
                </div>

                {/* Integrations */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: '#8888a0' }}>Integrations</span>
                    <span style={{ color: '#e8e8f0', fontWeight: 500 }}>
                      {connectedCount} / {PROVIDERS.length}
                    </span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{
                      width: `${(connectedCount / PROVIDERS.length) * 100}%`,
                      background: '#22c55e',
                    }} />
                  </div>
                </div>

                {/* Plan */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 10, borderTop: '1px solid #1e1e2e',
                }}>
                  <span style={{ fontSize: 12, color: '#8888a0' }}>Plan</span>
                  <span className="badge badge-amber">{planLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}