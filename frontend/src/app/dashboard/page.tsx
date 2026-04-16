'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Database, Users, MessageSquare, Plug,
  ArrowUpRight, ArrowRight, RefreshCw, Plus,
  CheckCircle2, Clock, Sparkles, Activity
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

  const stats = [
    {
      label: 'Queries this month',
      value: fmt(queriesUsed),
      sub: queriesLimit > 0 ? `of ${fmt(queriesLimit)}` : 'unlimited',
      icon: MessageSquare,
      progress: queriesPct,
    },
    {
      label: 'Knowledge base',
      value: fmt(totalChunks),
      sub: 'indexed chunks',
      icon: Database,
    },
    {
      label: 'Integrations',
      value: activeSources.toString(),
      sub: activeSources === 1 ? 'active source' : 'active sources',
      icon: Plug,
    },
    {
      label: 'Team',
      value: members.length.toString(),
      sub: members.length === 1 ? 'member' : 'members',
      icon: Users,
    },
  ]

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1280, margin: '0 auto', width: '100%' }}>

      {/* Hero / Welcome */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {greeting()}, {firstName}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            Here's what's happening across your workspace.
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
              <Plus size={14} /> Add integration
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {stats.map((stat, i) => (
          <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>{stat.label}</span>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={14} style={{ color: 'var(--text-secondary)' }} />
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 30, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {loading ? <span className="skel" style={{ display: 'inline-block', width: 60, height: 28 }} /> : stat.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>{stat.sub}</div>
            </div>
            {typeof stat.progress === 'number' && (
              <div className="progress" style={{ marginTop: 4 }}>
                <div className="progress-fill progress-amber" style={{ width: `${stat.progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Two-column content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>

        {/* Connected Sources */}
        <section className="card" style={{ overflow: 'hidden' }}>
          <header style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Connected sources</h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Data feeding your context engine</p>
            </div>
            <Link href="/dashboard/integrations" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Manage <ArrowRight size={12} />
              </span>
            </Link>
          </header>

          <div>
            {loading ? (
              <div style={{ padding: 40 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div className="skel" style={{ width: 36, height: 36, borderRadius: 8 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skel" style={{ height: 12, width: '40%', marginBottom: 6 }} />
                      <div className="skel" style={{ height: 10, width: '25%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : integrations.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-raised)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Plug size={20} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No sources yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
                  Connect your tools to start building context.
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
                  name={PROVIDER_LABELS[intg.provider] || intg.provider}
                  active={intg.is_active}
                  chunks={intg.total_chunks || 0}
                  lastSync={intg.last_synced_at ? relTime(intg.last_synced_at) : 'Never'}
                  isLast={i === integrations.length - 1}
                />
              ))
            )}
          </div>
        </section>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* System status */}
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>System status</h2>
              {health && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: allHealthy ? 'var(--success-text)' : 'var(--danger-text)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: allHealthy ? 'var(--success)' : 'var(--danger)' }} />
                  {allHealthy ? 'All systems operational' : 'Degraded'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {health ? (
                Object.entries(health.services || {}).map(([name, data]: [string, any], i, arr) => (
                  <div key={name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</span>
                    <span style={{
                      fontSize: 12,
                      color: data.status === 'connected' ? 'var(--success-text)' : 'var(--danger-text)',
                      fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', gap: 6
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: data.status === 'connected' ? 'var(--success)' : 'var(--danger)' }} />
                      {data.status === 'connected' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))
              ) : (
                [1, 2, 3].map(i => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="skel" style={{ height: 12, width: '60%' }} />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Activity */}
          <section className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Recent activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentEvents.length > 0 ? (
                recentEvents.map((ev, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < recentEvents.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--success-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--success-text)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {ev.label} synced
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {ev.time}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <Clock size={18} style={{ color: 'var(--text-disabled)', marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No activity yet</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

    </div>
  )
}

/* ─── Source Row ─── */
function SourceRow({ name, active, chunks, lastSync, isLast }: {
  name: string; active: boolean; chunks: number; lastSync: string; isLast: boolean
}) {
  return (
    <div
      className="hover:bg-white/[0.015]"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        transition: 'background var(--t-fast)'
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--bg-raised)', border: '1px solid var(--border-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        {name[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {fmt(chunks)} chunks · Synced {lastSync}
        </div>
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: active ? 'var(--success-text)' : 'var(--text-tertiary)',
        fontWeight: 500
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--success)' : 'var(--text-disabled)' }} />
        {active ? 'Active' : 'Paused'}
      </span>
    </div>
  )
}
