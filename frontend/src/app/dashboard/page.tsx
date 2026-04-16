'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Database, Users, MessageSquare, Plug,
  ArrowRight, Plus, CheckCircle2, Clock, Sparkles,
  TrendingUp, ArrowUpRight, Command, Search
} from 'lucide-react'
import { integrationsApi, billingApi, teamsApi, healthApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { BrandIcon } from '@/components/ui/BrandIcon'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

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
  return String(Math.round(n))
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
  slack: '#E01E5A',
  linear: '#5e6ad2',
  google_drive: '#00AC47',
}

/* ─── Mini sparkline ─── */
function Sparkline({ values, color = 'var(--brand)' }: { values: number[]; color?: string }) {
  const id = useMemo(() => `sp-${Math.random().toString(36).slice(2, 8)}`, [])
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)
  const w = 88, h = 32
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ')
  const areaPts = `0,${h} ${pts} ${w},${h}`

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={w} cy={h - ((values[values.length - 1] - min) / range) * h} r="2.5" fill={color} />
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

  const sparks = {
    queries: [3, 5, 4, 8, 6, 9, 12, 10, 14, 18, 15, 20],
    chunks:  [10, 12, 14, 13, 17, 22, 25, 30, 28, 35, 42, 48],
    sources: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, Math.max(activeSources, 4)],
    team:    [1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, Math.max(members.length, 1)],
  }

  const stats = [
    {
      label: 'Queries',
      value: queriesUsed,
      sub: queriesLimit > 0 ? `${queriesPct}% of ${fmt(queriesLimit)}` : 'unlimited',
      trend: '+18%',
      icon: MessageSquare,
      color: '#fbbf24',
      progress: queriesPct,
      spark: sparks.queries,
    },
    {
      label: 'Knowledge base',
      value: totalChunks,
      sub: 'indexed chunks',
      trend: '+24%',
      icon: Database,
      color: '#67e8f9',
      spark: sparks.chunks,
    },
    {
      label: 'Integrations',
      value: activeSources,
      sub: activeSources === 1 ? 'active source' : 'active sources',
      trend: activeSources > 0 ? '+1' : '',
      icon: Plug,
      color: '#a78bfa',
      spark: sparks.sources,
    },
    {
      label: 'Team',
      value: members.length,
      sub: members.length === 1 ? 'member' : 'members',
      icon: Users,
      color: '#86efac',
      spark: sparks.team,
    },
  ]

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1320, margin: '0 auto', width: '100%' }}>

      {/* ─── HERO — Aurora gradient mesh ─── */}
      <section className="card-gradient" style={{ overflow: 'hidden' }}>
        <div className="card-inner aurora noise" style={{ padding: '40px 44px', minHeight: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)',
                fontSize: 11.5, color: 'var(--brand-text)', fontWeight: 500, marginBottom: 18,
                boxShadow: '0 0 20px rgba(245,158,11,0.15)'
              }}>
                <Sparkles size={11} />
                <span style={{ letterSpacing: '0.02em' }}>WORKSPACE READY</span>
              </div>

              <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 12 }}>
                <span className="text-gradient-subtle">{greeting()}, </span>
                <span className="text-gradient">{firstName}</span>
                <span className="text-gradient-subtle">.</span>
              </h1>
              <p style={{ fontSize: 15.5, color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: 540 }}>
                Your context engine is live across{' '}
                <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeSources}</span>{' '}
                {activeSources === 1 ? 'source' : 'sources'} with{' '}
                <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(totalChunks)}</span>{' '}
                indexed chunks. Ask anything — it remembers everything.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, minWidth: 220 }}>
              <Link href="/dashboard/chat">
                <button className="btn btn-primary btn-lg elev-1" style={{ width: '100%' }}>
                  <MessageSquare size={16} /> Start chatting
                </button>
              </Link>
              <Link href="/dashboard/integrations">
                <button className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                  <Plus size={16} /> Add source
                </button>
              </Link>
              <div style={{
                marginTop: 6, padding: '8px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 11.5, color: 'var(--text-tertiary)',
                border: '1px dashed var(--border-base)',
                borderRadius: 8,
              }}>
                <Command size={12} />
                <span>Press</span>
                <kbd style={{
                  padding: '1px 6px', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace',
                  background: 'var(--bg-raised)', border: '1px solid var(--border-base)',
                  borderRadius: 4, color: 'var(--text-secondary)',
                }}>⌘K</kbd>
                <span>to search</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
        {stats.map((stat, i) => (
          <div key={i} className="card-gradient lift" style={{ height: '100%' }}>
            <div className="card-inner" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, minHeight: 160, position: 'relative' }}>
              {/* Color accent line top */}
              <div style={{
                position: 'absolute', top: 0, left: 16, right: 16, height: 1,
                background: `linear-gradient(90deg, transparent, ${stat.color}50, transparent)`
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '-0.005em' }}>{stat.label}</span>
                  {stat.trend && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10.5, color: 'var(--success-text)', fontWeight: 600,
                      fontFamily: 'JetBrains Mono, monospace', marginTop: 1,
                    }}>
                      <ArrowUpRight size={10} /> {stat.trend}
                    </span>
                  )}
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: `linear-gradient(135deg, ${stat.color}22, ${stat.color}08)`,
                  border: `1px solid ${stat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 20px ${stat.color}18`,
                }}>
                  <stat.icon size={15} style={{ color: stat.color }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 'auto' }}>
                <div>
                  <div className="num" style={{
                    fontSize: 34, fontWeight: 600, color: 'var(--text-primary)',
                    letterSpacing: '-0.035em', lineHeight: 1,
                  }}>
                    {loading ? (
                      <span className="skel" style={{ display: 'inline-block', width: 60, height: 30 }} />
                    ) : (
                      <AnimatedNumber value={stat.value} />
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6 }}>{stat.sub}</div>
                </div>
                {!loading && stat.spark && (
                  <div style={{ opacity: 0.9 }}>
                    <Sparkline values={stat.spark} color={stat.color} />
                  </div>
                )}
              </div>

              {typeof stat.progress === 'number' && (
                <div style={{
                  height: 4, background: 'var(--bg-raised)', borderRadius: 999, overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    height: '100%', width: `${stat.progress}%`,
                    background: `linear-gradient(90deg, ${stat.color}, ${stat.color}cc)`,
                    borderRadius: 999,
                    boxShadow: `0 0 8px ${stat.color}80`,
                    transition: 'width 900ms cubic-bezier(.16,1,.3,1)',
                  }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ─── TWO-COLUMN ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16 }}>

        {/* Connected Sources */}
        <section className="card-gradient">
          <div className="card-inner" style={{ overflow: 'hidden' }}>
            <header style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>Connected sources</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3 }}>Data streams powering your context</p>
              </div>
              <Link href="/dashboard/integrations" style={{ textDecoration: 'none' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12.5 }}>
                  Manage <ArrowRight size={12} />
                </button>
              </Link>
            </header>

            <div>
              {loading ? (
                <div style={{ padding: '20px 24px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0' }}>
                      <div className="skel" style={{ width: 40, height: 40, borderRadius: 10 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skel" style={{ height: 13, width: '35%', marginBottom: 6 }} />
                        <div className="skel" style={{ height: 10, width: '25%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : integrations.length === 0 ? (
                <div style={{ padding: '72px 24px', textAlign: 'center', position: 'relative' }}>
                  {/* Floating provider icons */}
                  <div style={{ position: 'relative', width: 220, height: 80, margin: '0 auto 24px' }}>
                    {['github', 'notion', 'slack', 'linear', 'google_drive'].map((p, i) => (
                      <div
                        key={p}
                        style={{
                          position: 'absolute',
                          left: `${i * 40}px`,
                          top: `${Math.sin(i) * 8 + 20}px`,
                          width: 44, height: 44, borderRadius: 12,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-base)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: 'var(--elev-1)',
                          transform: `rotate(${(i - 2) * 4}deg)`,
                          transition: 'transform 300ms',
                        }}
                      >
                        <BrandIcon provider={p} size={22} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.015em' }}>Connect your first source</div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                    GitHub, Notion, Slack, Linear, and Google Drive — bring your knowledge into one context.
                  </div>
                  <Link href="/dashboard/integrations">
                    <button className="btn btn-primary btn-md">
                      <Plus size={15} /> Browse integrations
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
            <div className="card-inner" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>System status</h2>
                {health && (
                  <span className={allHealthy ? 'chip chip-green' : 'chip'} style={{ padding: '3px 9px', fontSize: 11 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: allHealthy ? 'var(--success)' : 'var(--danger)',
                      boxShadow: allHealthy ? '0 0 8px var(--success)' : '0 0 8px var(--danger)',
                    }} className="anim-dot-pulse" />
                    {allHealthy ? 'Operational' : 'Degraded'}
                  </span>
                )}
              </div>
              <div>
                {health ? (
                  Object.entries(health.services || {}).map(([name, data]: [string, any], i, arr) => (
                    <div key={name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: data.status === 'connected' ? 'var(--success)' : 'var(--danger)',
                          boxShadow: data.status === 'connected' ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(239,68,68,0.5)'
                        }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 500 }}>{name}</span>
                      </div>
                      <span className="num" style={{
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
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div className="skel" style={{ height: 12, width: '60%' }} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Activity */}
          <section className="card-gradient">
            <div className="card-inner" style={{ padding: 22 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18, letterSpacing: '-0.01em' }}>Recent activity</h2>
              <div style={{ position: 'relative' }}>
                {recentEvents.length > 0 ? (
                  <>
                    <div style={{
                      position: 'absolute',
                      left: 15, top: 14, bottom: 14,
                      width: 1,
                      background: 'linear-gradient(180deg, transparent, var(--border-base) 10%, var(--border-base) 90%, transparent)'
                    }} />
                    {recentEvents.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '8px 0', position: 'relative' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'var(--bg-surface)',
                          border: '1.5px solid var(--success-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          zIndex: 1,
                          boxShadow: '0 0 0 4px var(--bg-surface), 0 0 12px rgba(16,185,129,0.15)',
                        }}>
                          <BrandIcon provider={ev.provider} size={14} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '-0.005em' }}>
                            {ev.label} synced
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {ev.time}
                          </div>
                        </div>
                        <CheckCircle2 size={14} style={{ color: 'var(--success-text)', opacity: 0.7, marginTop: 8 }} />
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

/* ─── Source Row — with real brand icon ─── */
function SourceRow({ provider, name, active, chunks, lastSync, isLast }: {
  provider: string; name: string; active: boolean; chunks: number; lastSync: string; isLast: boolean
}) {
  const color = PROVIDER_COLORS[provider] || '#9ca3af'
  return (
    <div
      className="hover:bg-white/[0.02]"
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 24px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        transition: 'background var(--t-fast)',
        cursor: 'pointer'
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: `linear-gradient(135deg, ${color}18, ${color}04)`,
        border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 2px 8px ${color}14`,
      }}>
        <BrandIcon provider={provider} size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="num">{fmt(chunks)} chunks</span>
          <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-disabled)' }} />
          <span>Synced {lastSync}</span>
        </div>
      </div>
      <span className={active ? 'chip chip-green' : 'chip'} style={{ padding: '3px 10px', fontSize: 11 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: active ? 'var(--success)' : 'var(--text-disabled)',
          boxShadow: active ? '0 0 8px var(--success)' : 'none'
        }} className={active ? 'anim-dot-pulse' : ''} />
        {active ? 'Active' : 'Paused'}
      </span>
    </div>
  )
}
