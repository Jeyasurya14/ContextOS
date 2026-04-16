'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Database, Users, MessageSquare, Plug,
  ArrowRight, Plus, MoreHorizontal, ChevronRight,
  Activity, CheckCircle2
} from 'lucide-react'
import { integrationsApi, billingApi, teamsApi, healthApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { BrandIcon } from '@/components/ui/BrandIcon'

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

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  notion: 'Notion',
  slack: 'Slack',
  linear: 'Linear',
  google_drive: 'Google Drive',
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
        time: relTime(i.last_synced_at),
        timestamp: new Date(i.last_synced_at).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
  }, [integrations])

  const allHealthy = health && Object.values(health.services || {}).every((s: any) => s.status === 'connected')

  return (
    <div className="anim-fade-up" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>

      {/* ─── PAGE HEADER (Render-style) ─── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              <span>ContextOS</span>
              <ChevronRight size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>Overview</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Overview
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
              A live view of your workspace, sources, and usage.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/dashboard/chat">
              <button className="btn btn-secondary btn-sm">
                <MessageSquare size={14} /> Open chat
              </button>
            </Link>
            <Link href="/dashboard/integrations">
              <button className="btn btn-primary btn-sm">
                <Plus size={14} /> New source
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── STAT STRIP (Render compact tiles) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatTile
          label="Queries"
          value={loading ? '—' : fmt(queriesUsed)}
          sub={queriesLimit > 0 ? `${queriesPct}% of ${fmt(queriesLimit)} limit` : 'no limit'}
          progress={queriesLimit > 0 ? queriesPct : undefined}
        />
        <StatTile
          label="Knowledge base"
          value={loading ? '—' : fmt(totalChunks)}
          sub="indexed chunks"
        />
        <StatTile
          label="Active sources"
          value={loading ? '—' : activeSources.toString()}
          sub={`of ${integrations.length || 0} connected`}
        />
        <StatTile
          label="Team"
          value={loading ? '—' : members.length.toString()}
          sub={members.length === 1 ? 'member' : 'members'}
        />
      </div>

      {/* ─── TWO-COLUMN: Services + Side panel ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>

        {/* Services table */}
        <section className="surface">
          <header style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <h2 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Sources</h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Data streams powering your context
              </p>
            </div>
            <Link href="/dashboard/integrations" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12.5 }}>
                Manage <ArrowRight size={12} />
              </button>
            </Link>
          </header>

          {loading ? (
            <div style={{ padding: 20 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                  <div className="skel" style={{ width: 28, height: 28, borderRadius: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skel" style={{ height: 11, width: '30%', marginBottom: 5 }} />
                    <div className="skel" style={{ height: 9, width: '18%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Chunks</th>
                  <th>Last sync</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {integrations.map(intg => (
                  <tr key={intg.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border-base)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <BrandIcon provider={intg.provider} size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>
                            {PROVIDER_LABELS[intg.provider] || intg.provider}
                          </div>
                          {intg.provider_username && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>
                              @{intg.provider_username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${intg.is_active ? 'status-live' : 'status-suspended'}`}>
                        <span className="status-pill-dot" />
                        {intg.is_active ? 'Live' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {fmt(intg.total_chunks || 0)}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                      {intg.last_synced_at ? relTime(intg.last_synced_at) : '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                        <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* System status */}
          <section className="surface" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>System</h2>
              {health && (
                <span className={`status-pill ${allHealthy ? 'status-live' : 'status-failed'}`}>
                  <span className="status-pill-dot" />
                  {allHealthy ? 'Operational' : 'Degraded'}
                </span>
              )}
            </div>
            <div>
              {health ? (
                Object.entries(health.services || {}).map(([name, data]: [string, any], i, arr) => (
                  <div key={name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: data.status === 'connected' ? 'var(--success)' : 'var(--danger)',
                      }} />
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</span>
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
                  <div key={i} style={{ padding: '9px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="skel" style={{ height: 11, width: '60%' }} />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Activity */}
          <section className="surface" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.005em', marginBottom: 14 }}>Recent activity</h2>
            {recentEvents.length > 0 ? (
              <div>
                {recentEvents.map((ev, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 0',
                    borderBottom: i < recentEvents.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}>
                    <BrandIcon provider={ev.provider} size={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {ev.label}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {ev.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                No activity yet
              </div>
            )}
          </section>
        </div>
      </div>

    </div>
  )
}

/* ─── Stat Tile ─── */
function StatTile({ label, value, sub, progress }: {
  label: string; value: string; sub: string; progress?: number;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-sub">{sub}</div>
      {typeof progress === 'number' && (
        <div style={{
          height: 3, background: 'var(--bg-raised)', borderRadius: 999,
          overflow: 'hidden', marginTop: 8,
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'var(--brand)',
            borderRadius: 999,
            transition: 'width 600ms cubic-bezier(.16,1,.3,1)',
          }} />
        </div>
      )}
    </div>
  )
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div style={{ padding: '56px 24px', textAlign: 'center' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-base)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Plug size={18} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.005em' }}>
        No sources connected
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 18, maxWidth: 320, margin: '0 auto 18px' }}>
        Connect GitHub, Notion, Slack, Linear, or Google Drive to start.
      </div>
      <Link href="/dashboard/integrations">
        <button className="btn btn-primary btn-sm">
          <Plus size={14} /> Connect source
        </button>
      </Link>
    </div>
  )
}
