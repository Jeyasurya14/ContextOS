'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, RefreshCw, Unlink, Plus, ExternalLink,
  ShieldCheck, Search, ChevronRight, MoreHorizontal
} from 'lucide-react'
import { integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { BrandIcon } from '@/components/ui/BrandIcon'

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

interface Provider {
  key: string
  apiKey: string
  label: string
  desc: string
  type: string
  isExtension?: boolean
}

const PROVIDERS: Provider[] = [
  { key: 'github', apiKey: 'github', label: 'GitHub', desc: 'Repositories, pull requests and issue history.', type: 'Source control' },
  { key: 'notion', apiKey: 'notion', label: 'Notion', desc: 'Wiki pages, docs and shared databases.', type: 'Knowledge base' },
  { key: 'slack', apiKey: 'slack', label: 'Slack', desc: 'Channel messages and thread history.', type: 'Communication' },
  { key: 'linear', apiKey: 'linear', label: 'Linear', desc: 'Issues, cycles and project roadmaps.', type: 'Project tracking' },
  { key: 'google', apiKey: 'google_drive', label: 'Google Drive', desc: 'Docs, sheets and shared folders.', type: 'Cloud storage' },
  { key: 'vscode', apiKey: 'vscode', label: 'VS Code', desc: 'Stream your local codebase to ContextOS.', type: 'Developer tooling', isExtension: true },
]

/* ─── Helpers ────────────────────────────────────────────────── */
function formatLastSync(isoStr: string | null): string {
  if (!isoStr) return 'Never'
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmt(n: number | null): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<Integration | null>(null)
  const [tab, setTab] = useState<'connected' | 'available'>('connected')
  const [filter, setFilter] = useState('')

  useEffect(() => { fetchIntegrations() }, [])

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
        toast.info(`Sync triggered for ${key}.`)
        return
      }
      toast.success(`${key} sync started`)
      setTimeout(fetchIntegrations, 2000)
    } catch {
      toast.error('Sync failed to start.')
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
  const filteredAvailable = availableProviders.filter(p =>
    !filter ||
    p.label.toLowerCase().includes(filter.toLowerCase()) ||
    p.type.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="anim-fade-up" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>

      {/* ─── PAGE HEADER ─── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              <span>ContextOS</span>
              <ChevronRight size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>Integrations</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Integrations
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Connect external services to feed your context engine.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setTab('available')}>
            <Plus size={14} /> New integration
          </button>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="tabs">
        <button className={`tab ${tab === 'connected' ? 'active' : ''}`} onClick={() => setTab('connected')}>
          Connected
          <span style={{
            marginLeft: 6,
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-raised)',
            padding: '1px 6px',
            borderRadius: 999,
          }}>
            {activeIntegrations.length}
          </span>
        </button>
        <button className={`tab ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>
          Browse
          <span style={{
            marginLeft: 6,
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-raised)',
            padding: '1px 6px',
            borderRadius: 999,
          }}>
            {availableProviders.length}
          </span>
        </button>
      </div>

      {/* ─── CONNECTED TAB ─── */}
      {tab === 'connected' && (
        <section className="surface">
          {loading ? (
            <div style={{ padding: 24 }}>
              {[1, 2].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i === 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div className="skel" style={{ width: 32, height: 32, borderRadius: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skel" style={{ height: 12, width: '25%', marginBottom: 6 }} />
                    <div className="skel" style={{ height: 10, width: '15%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : activeIntegrations.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-base)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <ShieldCheck size={18} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                No integrations connected
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 18 }}>
                Browse available providers to get started.
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setTab('available')}>
                <Plus size={14} /> Browse integrations
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Integration</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Last sync</th>
                  <th style={{ width: 140 }}></th>
                </tr>
              </thead>
              <tbody>
                {activeIntegrations.map(intg => {
                  const p = PROVIDERS.find(pr => pr.apiKey === intg.provider)
                  return (
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
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                              {p?.label || intg.provider}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                              {p?.type || 'External source'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {intg.provider_username ? `@${intg.provider_username}` : '—'}
                      </td>
                      <td>
                        <span className="status-pill status-live">
                          <span className="status-pill-dot" />
                          Live
                        </span>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {fmt(intg.total_chunks)} chunks
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                        {formatLastSync(intg.last_synced_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                            onClick={() => handleSync(intg.provider)}
                            disabled={syncing === intg.provider}
                          >
                            {syncing === intg.provider ? <Loader2 size={12} className="anim-spin" /> : <RefreshCw size={12} />}
                            Sync
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ width: 30, height: 30, padding: 0 }}
                            onClick={() => setDisconnecting(intg)}
                            title="Disconnect"
                          >
                            <Unlink size={13} style={{ color: 'var(--text-tertiary)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ─── AVAILABLE TAB ─── */}
      {tab === 'available' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              minWidth: 260,
            }}>
              <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
              <input
                placeholder="Search integrations"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 13, flex: 1,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
              {filteredAvailable.length} / {availableProviders.length}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filteredAvailable.map(p => (
              <ProviderCard
                key={p.key}
                provider={p}
                onConnect={handleConnect}
                connecting={connecting}
              />
            ))}
            {filteredAvailable.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  No providers match "{filter}"
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer note */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '28px 0 0',
        fontSize: 12, color: 'var(--text-tertiary)',
      }}>
        <ShieldCheck size={13} />
        <span>All credentials are encrypted at rest and scoped to your workspace.</span>
      </div>

      <ConfirmModal
        isOpen={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        onConfirm={handleDisconnect}
        title="Disconnect integration"
        message={`This will stop syncing updates from ${disconnecting ? (PROVIDERS.find(p => p.apiKey === disconnecting.provider)?.label || disconnecting.provider) : 'this source'}. Indexed data remains until you clear it from Settings.`}
        confirmLabel="Disconnect"
        isDangerous
      />
    </div>
  )
}

/* ─── Provider Card (Render-style flat) ─── */
function ProviderCard({ provider, onConnect, connecting }: {
  provider: Provider;
  onConnect: (k: string) => void;
  connecting: string | null;
}) {
  return (
    <div className="surface" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 170 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-base)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BrandIcon provider={provider.apiKey} size={22} />
        </div>
        <span style={{
          fontSize: 10.5,
          padding: '3px 8px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-base)',
          borderRadius: 999,
          color: 'var(--text-tertiary)',
          fontWeight: 500,
          letterSpacing: '-0.005em',
        }}>
          {provider.type}
        </span>
      </div>

      <div>
        <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>
          {provider.label}
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          {provider.desc}
        </p>
      </div>

      <button
        className="btn btn-secondary btn-sm"
        style={{ width: '100%', height: 34, marginTop: 'auto' }}
        onClick={() => onConnect(provider.key)}
        disabled={connecting === provider.key}
      >
        {connecting === provider.key ? (
          <><Loader2 size={13} className="anim-spin" /> Connecting…</>
        ) : provider.isExtension ? (
          <><ExternalLink size={13} /> Install extension</>
        ) : (
          <>Connect</>
        )}
      </button>
    </div>
  )
}
