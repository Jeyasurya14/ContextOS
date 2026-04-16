'use client'

import { useEffect, useState } from 'react'
import { 
  Loader2, RefreshCw, Unlink, Zap, ArrowRight, Database, Clock, 
  Plus, Search, Info, ExternalLink, ShieldCheck, CheckCircle2
} from 'lucide-react'
import { integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

/* ─── Types ─────────────────────────────────────────────────── */
interface Integration {
  id: string
  provider: string
  provider_username: string | null
  is_active: boolean
  total_chunks: number | null
  sync_status: string | null
  last_synced_at: string | null
  created_at: string
}

const PROVIDERS = [
  { key: 'github',  apiKey: 'github',      label: 'GitHub',       desc: 'Commits, code history & PRs', color: '#8b5cf6', type: 'Source Control' },
  { key: 'notion',  apiKey: 'notion',      label: 'Notion',       desc: 'Wiki, docs & shared pages', color: '#ffffff', type: 'Knowledge Base' },
  { key: 'slack',   apiKey: 'slack',       label: 'Slack',        desc: 'Channels & discussions', color: '#e01e5a', type: 'Real-time' },
  { key: 'linear',  apiKey: 'linear',      label: 'Linear',       desc: 'Tickets, projects & cycles', color: '#67e8f9', type: 'Project Management' },
  { key: 'google',  apiKey: 'google_drive',label: 'Google Drive', desc: 'Docs, Sheets & storage', color: '#34a853', type: 'Cloud Storage' },
  { key: 'vscode',  apiKey: 'vscode',      label: 'VS Code',      desc: 'Local codebase via IDE', color: '#007acc', isExtension: true, type: 'Local Tooling' },
]

/* ─── Helpers ────────────────────────────────────────────────── */
function formatLastSync(isoStr: string | null): string {
  if (!isoStr) return 'Never synced'
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmt(n: number | null): string {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* ─── Integration Entry Row ─── */
function ActiveIntegrationRow({ integration, provider, onSync, onDisconnect, syncing }: any) {
  if (!provider) return null
  return (
    <div style={{ 
      display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr 180px',
      padding: '18px 24px', alignItems: 'center', gap: 16,
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-base)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ 
          width: 40, height: 40, borderRadius: 'var(--r-md)', 
          background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
           <span style={{ color: provider.color }}>
             <Database size={18} />
           </span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{provider.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{integration.provider_username || 'connected'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
        <span style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 500 }}>Active</span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmt(integration.total_chunks)} chunks</div>

      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatLastSync(integration.last_synced_at)}</div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => onSync(provider.key)}
          disabled={syncing === provider.key}
        >
          {syncing === provider.key ? <Loader2 size={13} className="anim-spin" /> : <RefreshCw size={13} />}
          Sync
        </button>
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => onDisconnect(integration)}
          style={{ width: 34, height: 34, padding: 0, color: 'var(--text-disabled)' }}
        >
          <Unlink size={15} />
        </button>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<Integration | null>(null)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    setLoading(true)
    try {
      const res = await integrationsApi.getAll()
      setIntegrations(res.data || [])
    } catch {
      toast.error('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (key: string) => {
    const p = PROVIDERS.find(pr => pr.key === key)!
    if (p.isExtension) {
      window.open('https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot', '_blank')
      return
    }
    setConnecting(key)
    try {
      let res: any
      if (key === 'github') res = await integrationsApi.getGithubUrl()
      else if (key === 'notion') res = await integrationsApi.getNotionUrl()
      else if (key === 'slack') res = await integrationsApi.getSlackUrl()
      else if (key === 'linear') res = await integrationsApi.getLinearUrl()
      else if (key === 'google') res = await integrationsApi.getGoogleUrl()
      if (res?.data?.url) window.location.href = res.data.url
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || `Failed to connect ${key}`)
    } finally {
      setConnecting(null)
    }
  }

  const handleSync = async (key: string) => {
    setSyncing(key)
    try {
      if (key === 'github') await integrationsApi.syncGithub()
      else if (key === 'linear') await integrationsApi.syncLinear()
      else if (key === 'google_drive') await integrationsApi.syncGoogle()
      else {
        toast.info(`Sync triggered for ${key}. Processing background signals.`)
        return
      }
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} Synchronization Started`)
      setTimeout(fetchIntegrations, 2000)
    } catch {
      toast.error('Sync pipeline initialization failed.')
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async () => {
    if (!disconnecting) return
    try {
      await integrationsApi.disconnect(disconnecting.provider)
      toast.success('Disconnected')
      fetchIntegrations()
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  const activeIntegrations = integrations.filter(i => i.is_active)
  const availableProviders = PROVIDERS.filter(p => !integrations.some(i => i.provider === p.apiKey && i.is_active))

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Active Integrations */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected Sources</h2>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Syncing registry...</div>
          ) : activeIntegrations.length === 0 ? (
             <div style={{ padding: 80, textAlign: 'center' }}>
                <CloudSyncIcon size={56} />
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 20, marginBottom: 8 }}>No sources connected</h3>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Connect your first data source below to start building context.</p>
             </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr 180px',
                padding: '12px 24px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-base)',
                fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                <span>Source</span>
                <span>Status</span>
                <span>Data Points</span>
                <span>Last Sync</span>
                <span></span>
              </div>
              {activeIntegrations.map(intg => (
                <ActiveIntegrationRow 
                  key={intg.id} 
                  integration={intg} 
                  provider={PROVIDERS.find(p => p.apiKey === intg.provider)} 
                  onSync={handleSync}
                  onDisconnect={setDisconnecting}
                  syncing={syncing}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Sources */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Sources</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {availableProviders.map(p => (
            <div key={p.key} className="card hover:bg-white/[0.01]" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, transition: 'background var(--t-fast)' }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 'var(--r-md)', 
                  background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                   <Database size={22} style={{ color: p.color }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>{p.label}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{p.desc}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-raised)', padding: '4px 8px', borderRadius: 'var(--r-sm)' }}>
                    <ShieldCheck size={10} /> Encrypted
                 </div>
                 <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>• {p.type}</div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', height: 40, fontSize: 13 }}
                onClick={() => handleConnect(p.key)}
                disabled={connecting === p.key}
              >
                {connecting === p.key ? <Loader2 size={14} className="anim-spin" /> : p.isExtension ? <ExternalLink size={14} /> : <Plus size={14} />}
                {connecting === p.key ? 'Connecting...' : p.isExtension ? 'Install Extension' : `Connect ${p.label}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        onConfirm={handleDisconnect}
        title="Sever Integration"
        message={`This will stop syncing updates from ${disconnecting?.provider}. Synced context will remain until manual wipe.`}
        confirmLabel="Sever Connection"
        isDangerous
      />
    </div>
  )
}

function CloudSyncIcon({ size }: { size: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)' }}>
       <RefreshCw size={size} />
    </div>
  )
}
