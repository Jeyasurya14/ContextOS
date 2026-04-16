'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, RefreshCw, Unlink, Zap, ArrowRight, Database, Clock } from 'lucide-react'
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

/* ─── Provider definitions ───────────────────────────────────── */
const PROVIDERS = [
  {
    key: 'github',
    apiKey: 'github',
    label: 'GitHub',
    desc: 'Commits, code history & pull requests',
    color: '#8b5cf6',
    logo: (size = 20) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    key: 'notion',
    apiKey: 'notion',
    label: 'Notion',
    desc: 'Wiki, documents & shared pages',
    color: '#a1a1aa',
    logo: (size = 20) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933z"/>
      </svg>
    ),
  },
  {
    key: 'slack',
    apiKey: 'slack',
    label: 'Slack',
    desc: 'Public channels & discussions',
    color: '#e01e5a',
    logo: (size = 20) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
      </svg>
    ),
  },
  {
    key: 'linear',
    apiKey: 'linear',
    label: 'Linear',
    desc: 'Tickets, projects & cycles',
    color: '#5b5fc7',
    logo: (size = 20) => (
      <svg viewBox="0 0 100 100" fill="currentColor" width={size} height={size}>
        <path d="M1.22541 61.5228c-.16312-.9768.82765-1.634 1.66314-.9768l33.5678 27.0261c.8355.6572.4793 1.9615-.5706 2.0166L4.19009 91.3292c-.82765.04-1.57647-.5238-1.74121-1.3375L1.22541 61.5228zM.00163 46.8004c-.01341-1.0625.95768-1.8008 1.99648-1.5597L52.7546 56.8c1.0388.2411 1.3651 1.5352.5706 2.2764L3.33725 99.0315c-.7949.7415-2.02861.4-.88088-.6572L.00163 46.8004zM5.18298 27.5888c-.43929-.8878.06767-1.9615 1.04083-2.1243L98.2638 9.19456c.9732-.163 1.7397.76651 1.4567 1.71654L74.4736 98.0427c-.2831.9501-1.4567 1.2507-2.1339.5469L5.18298 27.5888z"/>
      </svg>
    ),
  },
  {
    key: 'google',
    apiKey: 'google_drive',
    label: 'Google Drive',
    desc: 'Docs, Sheets & knowledge base',
    color: '#34a853',
    logo: (size = 20) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M6.28 3l5.72 9.9-5.72 9.9H1.72L7.44 12.9 1.72 3zm5.72 0h8.56L14.84 12.9 20.56 22.8H12L6.28 12.9z" opacity=".8"/>
        <path d="M12 3l5.72 9.9H6.28zm0 18.9l5.72-9H6.28z"/>
      </svg>
    ),
  },
  {
    key: 'vscode',
    apiKey: 'vscode',
    label: 'VS Code',
    desc: 'Local codebase via IDE extension',
    color: '#007acc',
    isExtension: true,
    logo: (size = 20) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M23.15 2.587L18.21.21a1.494 1.494 0 00-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 00-1.276.057L.327 7.261A1 1 0 00.326 8.74L3.899 12 .326 15.26a1 1 0 00.001 1.479L1.65 17.94a.999.999 0 001.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 001.704.29l4.942-2.377A1.5 1.5 0 0024 20.06V3.939a1.5 1.5 0 00-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
      </svg>
    ),
  },
]

/* ─── Helpers ────────────────────────────────────────────────── */
function formatLastSync(isoStr: string | null): string {
  if (!isoStr) return 'Never synced'
  const d = new Date(isoStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatChunks(n: number | null): string {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* ─── Provider card ──────────────────────────────────────────── */
function ProviderCard({
  provider, integration, connecting, syncing, onConnect, onSync, onDisconnect,
}: {
  provider: typeof PROVIDERS[0]
  integration: Integration | undefined
  connecting: string | null
  syncing: string | null
  onConnect: (key: string) => void
  onSync: (key: string) => void
  onDisconnect: (integration: Integration) => void
}) {
  const connected = integration?.is_active === true

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 200 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 'var(--r-sm)',
          background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ color: connected ? provider.color : 'var(--text-tertiary)' }}>
            {provider.logo(20)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{provider.label}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{provider.desc}</p>
        </div>
      </div>

      {/* Body: Data */}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {connected && integration ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status</span>
              <span className="badge badge-green">Connected</span>
            </div>

            {integration.provider_username && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Account</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>@{integration.provider_username}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Synced Data</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontWeight: 500 }}>
                <Database style={{ width: 12, height: 12, color: 'var(--text-tertiary)' }} />
                {formatChunks(integration.total_chunks)} chunks
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Last Sync</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                <Clock style={{ width: 12, height: 12, color: 'var(--text-tertiary)' }} />
                {formatLastSync(integration.last_synced_at)}
              </div>
            </div>
            
            {integration.sync_status && integration.sync_status === 'error' && (
              <div style={{ fontSize: 12, color: 'var(--danger-text)', background: 'var(--danger-muted)', padding: '6px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--danger-border)' }}>
                Sync encountered an error. Please try again.
              </div>
            )}
            
            {integration.sync_status && integration.sync_status === 'syncing' && (
              <div style={{ fontSize: 12, color: 'var(--brand-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 style={{ width: 12, height: 12 }} className="anim-spin" />
                Sync currently in progress...
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>Not connected</span>
          </div>
        )}
      </div>

      {/* Footer: Actions */}
      <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
        {connected ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {!provider.isExtension && (
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => onSync(provider.key)}
                disabled={syncing === provider.key}
              >
                {syncing === provider.key ? <Loader2 style={{ width: 14, height: 14 }} className="anim-spin" /> : <RefreshCw style={{ width: 14, height: 14 }} />}
                {syncing === provider.key ? 'Syncing…' : 'Sync'}
              </button>
            )}
            <button
              className="btn"
              style={{ background: 'var(--bg-overlay)', borderColor: 'transparent', color: 'var(--text-secondary)' }}
              onClick={() => integration && onDisconnect(integration)}
            >
              <Unlink style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => onConnect(provider.key)}
            disabled={connecting === provider.key}
          >
            {connecting === provider.key ? <Loader2 className="anim-spin" style={{ width: 14, height: 14 }} /> : provider.isExtension ? <ArrowRight style={{ width: 14, height: 14 }} /> : null}
            {connecting === provider.key
              ? 'Connecting…'
              : provider.isExtension ? 'Install Extension' : `Connect ${provider.label}`
            }
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Hub Diagram ────────────────────────────────────────────── */
function IntegrationsOverview({ integrations, totalSources }: { integrations: Integration[]; totalSources: number }) {
  const activeCount = integrations.filter(i => i.is_active).length
  const totalChunks = integrations.reduce((acc, i) => acc + (i.total_chunks || 0), 0)

  return (
    <div className="card" style={{ marginBottom: 24, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Connection Status</h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>All data securely synced directly into your private context vectors.</p>
      </div>

      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Sources</p>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {activeCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 3 }}>/ {totalSources}</span>
          </div>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total Indexed</p>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {formatChunks(totalChunks)} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 3 }}>chunks</span>
          </div>
        </div>
        
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Pipeline</p>
          <span className={`badge ${activeCount > 0 ? 'badge-green' : 'badge-neutral'}`} style={{ marginTop: 6, display: 'inline-flex' }}>
            {activeCount > 0 ? 'Active' : 'Idle'}
          </span>
        </div>
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

    const p = new URLSearchParams(window.location.search)
    const success = p.get('success')
    const error = p.get('error')
    const username = p.get('username')
    if (success) {
      const label = username ? `${success.toUpperCase()}: @${username}` : success.toUpperCase()
      toast.success(`Connected ${label} successfully!`)
      window.history.replaceState({}, '', '/dashboard/integrations')
    } else if (error) {
      toast.error(`Failed to connect ${error.toUpperCase()}.`)
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
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

  const getIntegration = (provider: typeof PROVIDERS[0]) =>
    integrations.find(i => i.provider === provider.apiKey)

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
      else if (key === 'google') await integrationsApi.syncGoogle()
      else {
        const { default: api } = await import('@/lib/api')
        await api.post(`/api/v1/integrations/${key}/sync`)
      }
      toast.success('Sync started!')
      setTimeout(fetchIntegrations, 2000)
    } catch {
      toast.error('Sync failed. Please try again.')
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async () => {
    if (!disconnecting) return
    try {
      await integrationsApi.disconnect(disconnecting.provider)
      toast.success('Integration disconnected')
      fetchIntegrations()
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  const activeCount = integrations.filter(i => i.is_active).length
  const totalSources = PROVIDERS.filter(p => !p.isExtension).length

  return (
    <div className="anim-fade-up max-w-[1000px]">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Integrations
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          Connect your tools — everything streams securely into your private ContextOS engine.
        </p>
      </div>

      {/* Hub diagram replacement */}
      {!loading && (
        <IntegrationsOverview integrations={integrations} totalSources={totalSources} />
      )}

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {PROVIDERS.map(p => (
            <div key={p.key} className="card skel" style={{ height: 260 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.key}
              provider={p}
              integration={getIntegration(p)}
              connecting={connecting}
              syncing={syncing}
              onConnect={handleConnect}
              onSync={handleSync}
              onDisconnect={setDisconnecting}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        onConfirm={handleDisconnect}
        title="Disconnect Integration"
        message={`Disconnect ${disconnecting?.provider}? Synced data stays in your context, but new updates won't sync.`}
        confirmLabel="Disconnect"
        isDangerous
      />
    </div>
  )
}
