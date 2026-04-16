'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Database, Plug, Activity, TrendingUp, Users,
  Zap, Clock, Brain, GitCommit, FileText, Hash,
  ArrowRight, ChevronRight, Layers, Globe, CheckCircle2,
  Cpu, Terminal, RefreshCw, Plus, Search, Filter, MoreHorizontal
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

const PROVIDERS = [
  { key: 'github',  apiKey: 'github',      label: 'GitHub Repo',  icon: GitCommit, color: '#a78bfa', type: 'Source Control' },
  { key: 'notion',  apiKey: 'notion',      label: 'Notion Doc',   icon: FileText,  color: '#ffffff', type: 'Knowledge Base' },
  { key: 'slack',   apiKey: 'slack',       label: 'Slack App',    icon: Hash,      color: '#f87171', type: 'Real-time' },
  { key: 'linear',  apiKey: 'linear',      label: 'Linear App',   icon: Layers,    color: '#67e8f9', type: 'Issue Tracking' },
  { key: 'google',  apiKey: 'google_drive',label: 'GDrive Context', icon: Globe,     color: '#86efac', type: 'Cloud Storage' },
]

/* ─── Render Dashboard Table Row ─── */
function ServiceRow({ label, type, status, lastSync, chunks, icon: Icon, color }: any) {
  return (
    <div 
      style={{ 
        display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr 120px 40px',
        padding: '12px 24px', alignItems: 'center', gap: 16,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-base)', transition: 'background var(--t-fast)'
      }}
      className="group hover:bg-white/[0.02]"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: 'var(--r-md)', 
          background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon style={{ width: 14, height: 14, color }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>main-prod</div>
        </div>
      </div>
      
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{type}</div>
      
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'Active' ? 'var(--success)' : 'var(--text-disabled)' }} />
          <span style={{ fontSize: 12, color: status === 'Active' ? 'var(--success-text)' : 'var(--text-tertiary)', fontWeight: 500 }}>{status}</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{chunks || '—'} data points</div>
      
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>{lastSync}</div>

      <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><MoreHorizontal size={14} /></button>
    </div>
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

  // Derive real events from integrations
  const recentEvents = useMemo(() => {
    return integrations
      .filter(i => i.last_synced_at)
      .map(i => ({
        event: `${PROVIDERS.find(p => p.apiKey === i.provider)?.label || i.provider} Sync`,
        status: i.sync_status === 'completed' ? 'Success' : 'Active',
        time: relTime(i.last_synced_at),
        timestamp: new Date(i.last_synced_at).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
  }, [integrations])

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Resource Stats Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {[
          { label: 'Intelligence Usage', value: `${((usage?.queries_count || 0) / (usage?.queries_limit || 1)).toFixed(0)}%`, sub: `${usage?.queries_count || 0} / ${usage?.queries_limit || 0} queries`, icon: Cpu },
          { label: 'Indexed Context', value: fmt(integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)), sub: 'Processed data blocks', icon: Database },
          { label: 'Active Sources', value: integrations.filter(i => i.is_active).length.toString(), sub: 'Connected pipelines', icon: RefreshCw },
          { label: 'Workforce', value: members.length.toString(), sub: 'Authorized team members', icon: Users },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '16px 20px', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <stat.icon style={{ width: 12, height: 12, color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Service Registry (Table) ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ 
          padding: '16px 24px', borderBottom: '1px solid var(--border-base)', 
          background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Service Registry</h3>
             <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-sm)' }}>
                <Search size={12} style={{ color: 'var(--text-tertiary)' }} />
                <input placeholder="Filter..." style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 11, width: 120 }} />
             </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ fontWeight: 600 }}>
            <Plus size={14} /> New Source
          </button>
        </div>

        {/* Table Header */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr 120px 40px',
          padding: '10px 24px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-base)',
          fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.065em'
        }}>
          <span>Source Name</span>
          <span>Type</span>
          <span>Status</span>
          <span>Density</span>
          <span style={{ textAlign: 'right' }}>Last Activity</span>
          <span></span>
        </div>

        <div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading resource graph...</div>
          ) : integrations.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>No services deployed to this workspace yet.</div>
              <Link href="/dashboard/integrations">
                 <button className="btn btn-secondary">Connect your first source</button>
              </Link>
            </div>
          ) : (
            integrations.map(intg => {
              const p = PROVIDERS.find(pr => pr.apiKey === intg.provider) || { label: intg.provider, icon: Database, color: 'var(--text-secondary)', type: 'Custom' }
              return (
                <ServiceRow 
                  key={intg.id}
                  label={p.label}
                  type={p.type}
                  status={intg.is_active ? 'Active' : 'Disconnected'}
                  chunks={intg.total_chunks ? fmt(intg.total_chunks) : '0'}
                  lastSync={intg.last_synced_at ? relTime(intg.last_synced_at) : 'Never'}
                  icon={p.icon}
                  color={intg.is_active ? p.color : 'var(--text-disabled)'}
                />
              )
            })
          )}
        </div>
      </div>

      {/* ── Low-Level Activity Log (Timeline) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Terminal size={14} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Events</h3>
           </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentEvents.length > 0 ? (
                recentEvents.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>[{ev.time}]</span>
                        <span style={{ color: 'var(--text-primary)' }}>{ev.event}</span>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-overlay)', color: 'var(--text-tertiary)', borderRadius: 'var(--r-sm)' }}>{ev.status}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No recent sync activity detected.</div>
              )}
            </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Activity size={14} style={{ color: 'var(--success)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Intelligence Health</h3>
           </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {health ? (
                Object.entries(health.services || {}).map(([name, data]: [string, any]) => (
                  <div key={name} style={{ height: 44, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{name} Node</span>
                      {data.points_count !== undefined && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmt(data.points_count)} vectors</span>}
                      {data.used_memory_human !== undefined && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{data.used_memory_human} used</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: data.status === 'connected' ? 'var(--success)' : 'var(--danger)' }} />
                      <span style={{ fontSize: 12, color: data.status === 'connected' ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>
                        {data.status === 'connected' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>Linking system telemetry...</div>
              )}
            </div>
        </div>
      </div>

    </div>
  )
}