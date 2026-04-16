'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, RefreshCw, Unlink, Plus, ExternalLink,
  ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Search
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
  color: string
  type: string
  isExtension?: boolean
  scopes?: string[]
}

const PROVIDERS: Provider[] = [
  {
    key: 'github', apiKey: 'github', label: 'GitHub',
    desc: 'Sync commits, pull requests, issues and repository history.',
    color: '#a78bfa', type: 'Source control',
    scopes: ['Repositories', 'Pull requests', 'Issues']
  },
  {
    key: 'notion', apiKey: 'notion', label: 'Notion',
    desc: 'Ingest docs, wiki pages, and shared team spaces.',
    color: '#e5e7eb', type: 'Knowledge base',
    scopes: ['Pages', 'Databases', 'Comments']
  },
  {
    key: 'slack', apiKey: 'slack', label: 'Slack',
    desc: 'Index messages and channel context in real time.',
    color: '#E01E5A', type: 'Communication',
    scopes: ['Public channels', 'Threads', 'Files']
  },
  {
    key: 'linear', apiKey: 'linear', label: 'Linear',
    desc: 'Pull tickets, cycles, roadmaps and project history.',
    color: '#5e6ad2', type: 'Project tracking',
    scopes: ['Issues', 'Projects', 'Cycles']
  },
  {
    key: 'google', apiKey: 'google_drive', label: 'Google Drive',
    desc: 'Connect Docs, Sheets, Slides and shared folders.',
    color: '#00AC47', type: 'Cloud storage',
    scopes: ['Docs', 'Sheets', 'Shared drives']
  },
  {
    key: 'vscode', apiKey: 'vscode', label: 'VS Code',
    desc: 'Stream your local codebase through the ContextOS extension.',
    color: '#007acc', type: 'Developer tooling',
    isExtension: true,
    scopes: ['Workspace files', 'Editor state']
  },
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

/* ─── Active Row ─── */
function ActiveIntegrationRow({ integration, provider, onSync, onDisconnect, syncing, isLast }: {
  integration: Integration; provider: Provider | undefined;
  onSync: (k: string) => void; onDisconnect: (i: Integration) => void;
  syncing: string | null; isLast: boolean;
}) {
  if (!provider) return null
  return (
    <div
      className="hover:bg-white/[0.02]"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 2.2fr) 1fr 1fr 1fr 180px',
        padding: '18px 24px', alignItems: 'center', gap: 16,
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        transition: 'background var(--t-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11,
          background: `linear-gradient(135deg, ${provider.color}1e, ${provider.color}04)`,
          border: `1px solid ${provider.color}26`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 2px 8px ${provider.color}12`,
        }}>
          <BrandIcon provider={provider.apiKey} size={22} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{provider.label}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {integration.provider_username ? `@${integration.provider_username}` : provider.type}
          </div>
        </div>
      </div>

      <span className="chip chip-green" style={{ padding: '3px 10px', fontSize: 11 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--success)', boxShadow: '0 0 8px var(--success)'
        }} className="anim-dot-pulse" />
        Active
      </span>

      <div className="num" style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
        {fmt(integration.total_chunks)} chunks
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
        {formatLastSync(integration.last_synced_at)}
      </div>

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
          title="Disconnect"
        >
          <Unlink size={15} />
        </button>
      </div>
    </div>
  )
}

/* ─── Provider Card ─── */
function ProviderCard({ provider, onConnect, connecting }: {
  provider: Provider;
  onConnect: (k: string) => void;
  connecting: string | null;
}) {
  return (
    <div className="card-gradient lift" style={{ height: '100%' }}>
      <div className="card-inner" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, minHeight: 220, position: 'relative', overflow: 'hidden' }}>
        {/* Color accent */}
        <div style={{
          position: 'absolute', top: 0, left: 20, right: 20, height: 1,
          background: `linear-gradient(90deg, transparent, ${provider.color}55, transparent)`
        }} />

        {/* Subtle corner glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 140, height: 140,
          background: `radial-gradient(circle, ${provider.color}18, transparent 60%)`,
          pointerEvents: 'none', filter: 'blur(10px)',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `linear-gradient(135deg, ${provider.color}20, ${provider.color}06)`,
            border: `1px solid ${provider.color}2e`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 16px ${provider.color}1c`,
          }}>
            <BrandIcon provider={provider.apiKey} size={24} />
          </div>
          <span className="chip" style={{ fontSize: 10.5, padding: '3px 9px' }}>
            {provider.type}
          </span>
        </div>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.015em' }}>
            {provider.label}
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
            {provider.desc}
          </p>
        </div>

        {provider.scopes && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
            {provider.scopes.map(s => (
              <span key={s} style={{
                fontSize: 10.5, padding: '2px 8px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-base)',
                borderRadius: 999,
                color: 'var(--text-tertiary)',
                fontWeight: 500,
              }}>{s}</span>
            ))}
          </div>
        )}

        <button
          className="btn btn-primary btn-sm"
          style={{ width: '100%', height: 38 }}
          onClick={() => onConnect(provider.key)}
          disabled={connecting === provider.key}
        >
          {connecting === provider.key ? (
            <><Loader2 size={14} className="anim-spin" /> Connecting…</>
          ) : provider.isExtension ? (
            <><ExternalLink size={14} /> Install extension</>
          ) : (
            <><Plus size={14} /> Connect {provider.label}</>
          )}
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
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} sync started`)
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

  const totalChunks = integrations.reduce((s, i) => s + (i.total_chunks || 0), 0)

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1320, margin: '0 auto', width: '100%' }}>

      {/* ─── HERO ─── */}
      <section className="card-gradient" style={{ overflow: 'hidden' }}>
        <div className="card-inner aurora noise" style={{ padding: '36px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 620 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999,
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.18)',
                fontSize: 11.5, color: 'var(--brand-text)', fontWeight: 500, marginBottom: 16,
                boxShadow: '0 0 20px rgba(245,158,11,0.15)',
              }}>
                <Sparkles size={11} />
                <span style={{ letterSpacing: '0.02em' }}>INTEGRATIONS</span>
              </div>

              <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
                <span className="text-gradient-subtle">Connect your </span>
                <span className="text-gradient">toolstack</span>
              </h1>
              <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: 520 }}>
                One context engine across GitHub, Notion, Slack, Linear and Google Drive.{' '}
                <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeIntegrations.length}</span> connected,{' '}
                <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(totalChunks)}</span> chunks indexed.
              </p>
            </div>

            {/* Floating brand gallery */}
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {PROVIDERS.slice(0, 5).map((p, i) => (
                <div key={p.key} style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `linear-gradient(135deg, ${p.color}20, ${p.color}08)`,
                  border: `1px solid ${p.color}2c`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: `translateY(${Math.sin(i) * 4}px) rotate(${(i - 2) * 3}deg)`,
                  boxShadow: `0 4px 16px ${p.color}20`,
                  transition: 'transform 300ms',
                }}>
                  <BrandIcon provider={p.apiKey} size={22} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ACTIVE ─── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>Connected</h2>
            <span className="chip" style={{ padding: '2px 9px', fontSize: 11 }}>
              {activeIntegrations.length}
            </span>
          </div>
        </div>

        <div className="card-gradient">
          <div className="card-inner" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 24 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i === 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="skel" style={{ width: 42, height: 42, borderRadius: 11 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skel" style={{ height: 13, width: '30%', marginBottom: 6 }} />
                      <div className="skel" style={{ height: 10, width: '18%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeIntegrations.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))',
                  border: '1px solid var(--brand-border)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  <CheckCircle2 size={22} style={{ color: 'var(--brand)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                  Nothing connected yet
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 340, margin: '0 auto' }}>
                  Pick a provider below to start streaming your context.
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 2.2fr) 1fr 1fr 1fr 180px',
                  padding: '12px 24px', background: 'rgba(255,255,255,0.015)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <span>Source</span>
                  <span>Status</span>
                  <span>Data</span>
                  <span>Last sync</span>
                  <span></span>
                </div>
                {activeIntegrations.map((intg, i) => (
                  <ActiveIntegrationRow
                    key={intg.id}
                    integration={intg}
                    provider={PROVIDERS.find(p => p.apiKey === intg.provider)}
                    onSync={handleSync}
                    onDisconnect={setDisconnecting}
                    syncing={syncing}
                    isLast={i === activeIntegrations.length - 1}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── AVAILABLE ─── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>Browse integrations</h2>
            <span className="chip" style={{ padding: '2px 9px', fontSize: 11 }}>
              {availableProviders.length}
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-base)',
            borderRadius: 8,
            minWidth: 240,
          }}>
            <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="Filter by name or type…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 13, flex: 1,
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
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
      </section>

      {/* Security footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '16px 0',
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
        message={`This will stop syncing updates from ${disconnecting?.provider ? PROVIDERS.find(p => p.apiKey === disconnecting.provider)?.label || disconnecting.provider : 'this source'}. Indexed data remains until you clear it from Settings.`}
        confirmLabel="Disconnect"
        isDangerous
      />
    </div>
  )
}
