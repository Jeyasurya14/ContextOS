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

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
         <button 
           className="btn btn-ghost" 
           style={{ width: 28, height: 28, padding: 0 }}
           onClick={() => {
             if (status === 'Active') {
               integrationsApi.syncGithub().then(() => alert('Sync started for ' + label));
             }
           }}
         >
           <RefreshCw size={14} style={{ color: 'var(--text-disabled)' }} />
         </button>
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
  const [members, setMembers] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [filter, setFilter] = useState('')
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

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { label: 'Intelligence Usage', value: `${((usage?.queries_count || 0) / (usage?.queries_limit || 1)).toFixed(0)}%`, sub: `${usage?.queries_count || 0} / ${usage?.queries_limit || 0} queries`, icon: Cpu },
          { label: 'Indexed Context', value: fmt(integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)), sub: 'Processed data blocks', icon: Database },
          { label: 'Active Sources', value: integrations.filter(i => i.is_active).length.toString(), sub: 'Connected pipelines', icon: RefreshCw },
          { label: 'Team Members', value: members.length.toString(), sub: 'Workspace users', icon: Users },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <stat.icon style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Service Registry */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ 
          padding: '18px 24px', borderBottom: '1px solid var(--border-base)', 
          background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Connected Sources</h3>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
                <input 
                  placeholder="Filter sources..." 
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 12, width: 140 }} 
                />
             </div>
          </div>
          <Link href="/dashboard/integrations">
            <button className="btn btn-primary btn-sm">
              <Plus size={14} /> Add Source
            </button>
          </Link>
        </div>

        {/* Table Header */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr 120px 40px',
          padding: '12px 24px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-base)',
          fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          <span>Source</span>
          <span>Type</span>
          <span>Status</span>
          <span>Data Points</span>
          <span style={{ textAlign: 'right' }}>Last Sync</span>
          <span></span>
        </div>

        <div>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading sources...</div>
          ) : integrations.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center' }}>
              <Database size={48} style={{ margin: '0 auto 16px', color: 'var(--text-disabled)' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No sources connected</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>Connect your first data source to start building context.</div>
              <Link href="/dashboard/integrations">
                 <button className="btn btn-primary">Connect Source</button>
              </Link>
            </div>
          ) : (
            integrations
              .filter(i => {
                const p = PROVIDERS.find(pr => pr.apiKey === i.provider)
                return !filter || p?.label.toLowerCase().includes(filter.toLowerCase()) || i.provider.toLowerCase().includes(filter.toLowerCase())
              })
              .map(intg => {
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

      {/* Activity & Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: '24px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Terminal size={16} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Recent Activity</h3>
           </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentEvents.length > 0 ? (
                recentEvents.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentEvents.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{ev.event}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ev.time}</span>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: 10 }}>{ev.status}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px 0' }}>No recent activity</div>
              )}
            </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Activity size={16} style={{ color: 'var(--success)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>System Health</h3>
           </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {health ? (
                Object.entries(health.services || {}).map(([name, data]: [string, any]) => (
                  <div key={name} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{name}</span>
                      {data.points_count !== undefined && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmt(data.points_count)} vectors</span>}
                      {data.used_memory_human !== undefined && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{data.used_memory_human}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: data.status === 'connected' ? 'var(--success)' : 'var(--danger)' }} />
                      <span style={{ fontSize: 12, color: data.status === 'connected' ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 500 }}>
                        {data.status === 'connected' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px 0' }}>Loading health data...</div>
              )}
            </div>
        </div>
      </div>

    </div>
  )
}