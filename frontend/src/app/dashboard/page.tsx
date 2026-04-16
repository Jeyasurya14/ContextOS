'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Database, Users, MessageSquare, Plug,
  ArrowRight, Plus, CheckCircle2, Clock, Sparkles,
  TrendingUp, Zap
} from 'lucide-react'
import { integrationsApi, billingApi, teamsApi, healthApi } from '@/lib/api'
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

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  notion: 'Notion',
  slack: 'Slack',
  linear: 'Linear',
  google_drive: 'Google Drive',
}

const PROVIDER_COLORS: Record<string, string> = {
  github: '#a78bfa',
  notion: '#e5e7eb',
  slack: '#f87171',
  linear: '#67e8f9',
  google_drive: '#86efac',
}

/* ─── Mini sparkline ─── */
function Sparkline({ values, color = 'var(--brand)' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)
  const w = 80, h = 28
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ')
  const areaPts = `0,${h} ${pts} ${w},${h}`
  const id = useMemo(() => `sp-${Math.random().toString(36).slice(2, 8)}`, [])

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const isInitialized = useAuthStore(s => s.isInitialized)
  const [usage, setUsage] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isInitialized) return
    ;(async () => {
      setLoading(true)
      try {
        const [uRes, iRes, mRes, hRes] = await Promise.allSettled([
          billingApi.getUsage(),
          integrationsApi.getAll(),
          teamsApi.getMembers(),
          healthApi.getHealth()
        ])
        if (uRes.status === 'fulfilled') setUsage(uRes.value.data)
        if (iRes.status === 'fulfilled') setIntegrations(iRes.value.data || [])
        if (mRes.status === 'fulfilled') setMembers(mRes.value.data || [])
        if (hRes.status === 'fulfilled') setHealth(hRes.value.data)
      } finally { setLoading(false) }
    })()
  }, [isInitialized])

  const queriesUsed = usage?.queries_count || 0
  const queriesLimit = usage?.queries_limit || 0
  const queriesPct = queriesLimit > 0 ? Math.min(100, Math.round((queriesUsed / queriesLimit) * 100)) : 0
  const totalChunks = integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)
  const activeSources = integrations.filter(i => i.is_active).length

  const recentEvents = useMemo(() => {
    return integrations
      .filter(i => i.last_synced_at)
      .map(i => ({
        provider: i.provider,
        label: PROVIDER_LABELS[i.provider] || i.provider,
        status: i.sync_status,
        time: relTime(i.last_synced_at),
        timestamp: new Date(i.last_synced_at).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
  }, [integrations])

  const firstName = (user?.name || 'there').split(' ')[0]
  const allHealthy = health && Object.values(health.services || {}).every((s: any) => s.status === 'connected')

  // Sample sparkline data (deterministic, visual-only)
  const sparks = {
    queries: [3, 5, 4, 8, 6, 9, 12, 10, 14, 18, 15, 20],
    chunks:  [10, 12, 14, 13, 17, 22, 25, 30, 28, 35, 42, 48],
    sources: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, activeSources || 4],
    team:    [1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, members.length || 4],
  }

  const stats = [
    {
      label: 'Queries this month',
      value: fmt(queriesUsed),
      sub: queriesLimit > 0 ? `of ${fmt(queriesLimit)} · ${queriesPct}%` : 'unlimited',
      icon: MessageSquare,
      color: '#fbbf24',
      progress: queriesPct,
      spark: sparks.queries,
    },
    {
      label: 'Knowledge base',
      value: fmt(totalChunks),
      sub: 'indexed chunks',
      icon: Database,
      color: '#67e8f9',
      spark: sparks.chunks,
    },
    {
      label: 'Integrations',
      value: activeSources.toString(),
      sub: activeSources === 1 ? 'active source' : 'active sources',
      icon: Plug,
      color: '#a78bfa',
      spark: sparks.sources,
    },
    {
      label: 'Team',
      value: members.length.toString(),
      sub: members.length === 1 ? 'member' : 'members',
      icon: Users,
      color: '#86efac',
      spark: sparks.team,
    },
  ]

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1280, margin: '0 auto', width: '100%' }}>

      {/* HERO — featured card with ambient glow */}
      <section className="card-gradient glow-amber" style={{ overflow: 'hidden' }}>
        <div className="card-inner grid-bg" style={{ padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 620 }}>
            <div className="chip chip-amber" style={{ marginBottom: 14 }}>
              <Sparkles size={12} /> Workspace ready
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 8 }}>
              {greeting()}, {firstName}.
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-tertiary)', lineHeight: 1.55, maxWidth: 520 }}>
              Your context engine is live across {activeSources} {activeSources === 1 ? 'source' : 'sources'} with{' '}
              <span className="num" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{fmt(totalChunks)}</span> indexed chunks. Ask anything, it remembers everything.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <Link href="/dashboard/chat">
              <button className="btn btn-primary btn-md">
                <MessageSquare size={15} /> Start chatting
              </button>
            </Link>
            <Link href="/dashboard/integrations">
              <button className="btn btn-secondary btn-md">
                <Plus size={15} /> Add source
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {stats.map((stat, i) => (
          <div key={i} className="card-gradient" style={{ height: '100%' }}>
            <div className="card-inner" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 140 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>{stat.label}</span>
                </div>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${stat.color}15`,
                  border: `1px solid ${stat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <stat.icon size={14} style={{ color: stat.color }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 'auto' }}>
                <div>
                  <div className="num" style={{ fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.035em', lineHeight: 1 }}>
                    {loading ? <span className="skel" style={{ display: 'inline-block', width: 60, height: 28 }} /> : stat.value}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6 }}>{stat.sub}</div>
                </div>
                {!loading && stat.spark && (
                  <div style={{ opacity: 0.85 }}>
                    <Sparkline values={stat.spark} color={stat.color} />
                  </div>
                )}
              </div>

              {typeof stat.progress === 'number' && (
                <div className="progress" style={{ height: 3 }}>
                  <div className="progress-fill progress-amber" style={{ width: `${stat.progress}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TWO-COLUMN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16 }}>

        {/* Connected Sources */}
        <section className="card-gradient">
          <div className="card-inner" style={{ overflow: 'hidden' }}>
            <header style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>Connected sources</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3 }}>Data streams powering your context</p>
              </div>
              <Link href="/dashboard/integrations" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                  Manage all <ArrowRight size={12} />
                </span>
              </Link>
            </header>

            <div>
              {loading ? (
                <div style={{ padding: '20px 22px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                      <div className="skel" style={{ width: 36, height: 36, borderRadius: 10 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skel" style={{ height: 12, width: '35%', marginBottom: 6 }} />
                        <div className="skel" style={{ height: 10, width: '20%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : integrations.length === 0 ? (
                <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))',
                    border: '1px solid var(--brand-border)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 18,
                  }}>
                    <Plug size={22} style={{ color: 'var(--brand)' }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.01em' }}>No sources yet</div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 22, maxWidth: 320, margin: '0 auto 22px' }}>
                    Connect GitHub, Notion, Slack, Linear, or Google Drive to start building context.
                  </div>
                  <Link href="/dashboard/integrations">
                    <button className="btn btn-primary btn-sm">
                      <Plus size={14} /> Connect a source
                    </button>
                  </Link>
                </div>
              ) : (
                integrations.map((intg, i) => (
                  <SourceRow
                    key={intg.id}
                    provider={intg.provider}
                    name={PROVIDER_LABELS[intg.provider] || intg.provider}
                    active={intg.is_active}
                    chunks={intg.total_chunks || 0}
                    lastSync={intg.last_synced_at ? relTime(intg.last_synced_at) : 'Never'}
                    isLast={i === integrations.length - 1}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status */}
          <section className="card-gradient">
            <div className="card-inner" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>System status</h2>
                {health && (
                  <span className={allHealthy ? 'chip chip-green' : 'chip'} style={{ padding: '3px 9px', fontSize: 11 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: allHealthy ? 'var(--success)' : 'var(--danger)' }} />
                    {allHealthy ? 'Operational' : 'Degraded'}
                  </span>
                )}
              </div>
              <div>
                {health ? (
                  Object.entries(health.services || {}).map(([name, data]: [string, any], i, arr) => (
                    <div key={name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '11px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: data.status === 'connected' ? 'var(--success)' : 'var(--danger)',
                          boxShadow: data.status === 'connected' ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(239,68,68,0.4)'
                        }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 500 }}>{name}</span>
                      </div>
                      <span style={{
                        fontSize: 11.5,
                        color: 'var(--text-tertiary)',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        {data.points_count !== undefined ? `${fmt(data.points_count)} vec` : data.used_memory_human || '—'}
                      </span>
                    </div>
                  ))
                ) : (
                  [1, 2, 3].map(i => (
                    <div key={i} style={{ padding: '11px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div className="skel" style={{ height: 12, width: '60%' }} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Activity */}
          <section className="card-gradient">
            <div className="card-inner" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: '-0.01em' }}>Recent activity</h2>
              <div style={{ position: 'relative' }}>
                {recentEvents.length > 0 ? (
                  <>
                    {/* Vertical timeline line */}
                    <div style={{
                      position: 'absolute',
                      left: 13, top: 14, bottom: 14,
                      width: 1,
                      background: 'var(--border-subtle)'
                    }} />
                    {recentEvents.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '8px 0', position: 'relative' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: 'var(--bg-surface)',
                          border: '1.5px solid var(--success-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          zIndex: 1
                        }}>
                          <CheckCircle2 size={12} style={{ color: 'var(--success-text)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '-0.005em' }}>
                            {ev.label} synced
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {ev.time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ padding: '28px 0', textAlign: 'center' }}>
                    <Clock size={20} style={{ color: 'var(--text-disabled)', marginBottom: 10 }} />
                    <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>No activity yet</div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

    </div>
  )
}

/* ─── Source Row ─── */
function SourceRow({ provider, name, active, chunks, lastSync, isLast }: {
  provider: string; name: string; active: boolean; chunks: number; lastSync: string; isLast: boolean
}) {
  const color = PROVIDER_COLORS[provider] || '#9ca3af'
  return (
    <div
      className="hover:bg-white/[0.018]"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        transition: 'background var(--t-fast)'
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `linear-gradient(135deg, ${color}1e, ${color}08)`,
        border: `1px solid ${color}24`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 600,
        color,
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}>
        {name[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="num">{fmt(chunks)} chunks</span>
          <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-disabled)' }} />
          <span>Synced {lastSync}</span>
        </div>
      </div>
      <span className={active ? 'chip chip-green' : 'chip'} style={{ padding: '3px 9px', fontSize: 11 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: active ? 'var(--success)' : 'var(--text-disabled)' }} />
        {active ? 'Active' : 'Paused'}
      </span>
    </div>
  )
}
