// frontend/src/app/dashboard/integrations/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, RefreshCw, Unlink, CheckCircle2, Zap, ArrowRight, Database, Clock } from 'lucide-react'
import { integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

/* ─── Types ─────────────────────────────────────────────────── */
interface Integration {
  id: string
  provider: string            // "github" | "notion" | "slack" | "linear" | "google_drive"
  provider_username: string | null
  is_active: boolean
  total_chunks: number | null
  sync_status: string | null
  last_synced_at: string | null
  created_at: string
}

/* ─── Provider definitions ───────────────────────────────────── */
// Note: backend uses "google_drive" not "google"
const PROVIDERS = [
  {
    key: 'github',
    apiKey: 'github',          // matches backend provider value
    label: 'GitHub',
    desc: 'Commits, pull requests, issues & code history',
    color: '#8b5cf6',
    textColor: '#c4b5fd',
    particles: ['commit', 'PR', 'issue', 'branch'],
    logo: (size = 24) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    key: 'notion',
    apiKey: 'notion',
    label: 'Notion',
    desc: 'Pages, databases & team knowledge base',
    color: '#9ca3af',
    textColor: '#e4e4e7',
    particles: ['page', 'doc', 'database', 'wiki'],
    logo: (size = 24) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933z"/>
      </svg>
    ),
  },
  {
    key: 'slack',
    apiKey: 'slack',
    label: 'Slack',
    desc: 'Channels, threads & team conversations',
    color: '#e01e5a',
    textColor: '#fb7185',
    particles: ['message', 'thread', 'channel', 'mention'],
    logo: (size = 24) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
      </svg>
    ),
  },
  {
    key: 'linear',
    apiKey: 'linear',
    label: 'Linear',
    desc: 'Issues, projects, cycles & roadmaps',
    color: '#5b5fc7',
    textColor: '#818cf8',
    particles: ['issue', 'sprint', 'project', 'cycle'],
    logo: (size = 24) => (
      <svg viewBox="0 0 100 100" fill="currentColor" width={size} height={size}>
        <path d="M1.22541 61.5228c-.16312-.9768.82765-1.634 1.66314-.9768l33.5678 27.0261c.8355.6572.4793 1.9615-.5706 2.0166L4.19009 91.3292c-.82765.04-1.57647-.5238-1.74121-1.3375L1.22541 61.5228zM.00163 46.8004c-.01341-1.0625.95768-1.8008 1.99648-1.5597L52.7546 56.8c1.0388.2411 1.3651 1.5352.5706 2.2764L3.33725 99.0315c-.7949.7415-2.02861.4-.88088-.6572L.00163 46.8004zM5.18298 27.5888c-.43929-.8878.06767-1.9615 1.04083-2.1243L98.2638 9.19456c.9732-.163 1.7397.76651 1.4567 1.71654L74.4736 98.0427c-.2831.9501-1.4567 1.2507-2.1339.5469L5.18298 27.5888z"/>
      </svg>
    ),
  },
  {
    key: 'google',
    apiKey: 'google_drive',   // ← backend returns "google_drive"
    label: 'Google Drive',
    desc: 'Docs, Sheets, Slides & shared files',
    color: '#34a853',
    textColor: '#4ade80',
    particles: ['doc', 'sheet', 'file', 'folder'],
    logo: (size = 24) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M6.28 3l5.72 9.9-5.72 9.9H1.72L7.44 12.9 1.72 3zm5.72 0h8.56L14.84 12.9 20.56 22.8H12L6.28 12.9z" opacity=".7"/>
        <path d="M12 3l5.72 9.9H6.28zm0 18.9l5.72-9H6.28z"/>
      </svg>
    ),
  },
  {
    key: 'vscode',
    apiKey: 'vscode',
    label: 'VS Code',
    desc: 'Workspace files via the extension',
    color: '#007acc',
    textColor: '#38bdf8',
    particles: ['file', 'code', 'workspace', 'edit'],
    isExtension: true,
    logo: (size = 24) => (
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

/* ─── Wire lane animation (per-card) ─────────────────────────── */
function WireLanes({ color, active }: { color: string; active: boolean }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        height: '56px',
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
      />

      {/* Three flow lanes */}
      <div className="absolute inset-0 flex flex-col justify-around px-3 py-2">
        {[0, 1, 2].map(lane => (
          <div key={lane} className="relative flex items-center" style={{ height: '2px' }}>
            {/* Base track */}
            <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.04)' }} />

            {active && (
              <>
                {/* Flowing highlight */}
                <div
                  className="absolute h-full"
                  style={{
                    width: '35%',
                    background: `linear-gradient(90deg, transparent, ${color}aa, transparent)`,
                    animation: `intWireFlow 2.8s ease-in-out ${lane * 0.75}s infinite`,
                  }}
                />
                {/* Data packet dot */}
                <div
                  className="absolute w-1.5 h-1.5 rounded-full -translate-y-[2px]"
                  style={{
                    background: color,
                    boxShadow: `0 0 5px ${color}`,
                    animation: `intPacket 2.8s linear ${lane * 0.75}s infinite`,
                  }}
                />
              </>
            )}

            {/* Source node */}
            <div
              className="absolute left-0 w-1 h-1 rounded-full -translate-x-0.5"
              style={{
                background: active ? color : '#3f3f46',
                transition: 'background 0.5s',
              }}
            />
            {/* Dest node */}
            <div
              className="absolute right-0 w-1 h-1 rounded-full translate-x-0.5"
              style={{
                background: active ? '#d97706' : '#3f3f46',
                boxShadow: active ? '0 0 4px rgba(217,119,6,0.8)' : 'none',
                transition: 'all 0.5s',
              }}
            />
          </div>
        ))}
      </div>

      {/* Labels when inactive */}
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-dark-700 font-medium">Not connected</span>
        </div>
      )}

      {/* CTX label */}
      {active && (
        <div
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(217,119,6,0.5)' }}
        >
          ctx
        </div>
      )}
    </div>
  )
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
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="relative rounded-2xl flex flex-col overflow-hidden transition-all duration-200"
      style={{
        background: 'rgba(15,15,17,0.85)',
        border: connected
          ? `1px solid ${provider.color}30`
          : hovered
            ? `1px solid rgba(255,255,255,0.1)`
            : '1px solid rgba(255,255,255,0.06)',
        boxShadow: connected && hovered
          ? `0 0 28px ${provider.color}10, 0 8px 32px rgba(0,0,0,0.3)`
          : hovered
            ? '0 8px 28px rgba(0,0,0,0.2)'
            : 'none',
        backdropFilter: 'blur(12px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(10px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease, border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top ambient glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${provider.color}15 0%, transparent 70%)`,
          opacity: hovered || connected ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      <div className="relative p-5 flex flex-col gap-4 flex-1">

        {/* Row 1: icon + title + status */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{
              background: connected ? `${provider.color}12` : 'rgba(24,24,27,0.9)',
              border: connected ? `1px solid ${provider.color}28` : '1px solid rgba(255,255,255,0.07)',
              color: connected ? provider.color : '#52525b',
            }}
          >
            {provider.logo(18)}
          </div>

          {/* Title + desc */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-semibold text-white text-sm leading-tight">{provider.label}</h3>
              {connected && (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0"
                  style={{
                    background: 'rgba(22,163,74,0.1)',
                    border: '1px solid rgba(22,163,74,0.2)',
                    color: '#22c55e',
                  }}
                >
                  <span
                    className="w-1 h-1 rounded-full bg-green-500"
                    style={{ animation: 'pulse 2s ease-in-out infinite' }}
                  />
                  Live
                </span>
              )}
            </div>
            <p className="text-[11px] text-dark-500 leading-snug">{provider.desc}</p>
          </div>
        </div>

        {/* Row 2: Wire animation */}
        <WireLanes color={provider.color} active={connected} />

        {/* Row 3: Real data stats (only when connected) */}
        {connected && integration && (
          <div className="flex items-center gap-3">
            {integration.total_chunks !== null && integration.total_chunks !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: provider.textColor }}>
                <Database className="w-3 h-3 flex-shrink-0" />
                <span className="font-semibold">{formatChunks(integration.total_chunks)}</span>
                <span className="text-dark-600">chunks</span>
              </div>
            )}
            {integration.last_synced_at && (
              <div className="flex items-center gap-1.5 text-[11px] text-dark-600 ml-auto">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{formatLastSync(integration.last_synced_at)}</span>
              </div>
            )}
            {integration.provider_username && (
              <div
                className="text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto"
                style={{ color: provider.textColor, background: `${provider.color}10` }}
              >
                @{integration.provider_username}
              </div>
            )}
            {integration.sync_status && integration.sync_status !== 'completed' && (
              <div
                className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                style={{
                  background: integration.sync_status === 'syncing'
                    ? 'rgba(217,119,6,0.1)'
                    : integration.sync_status === 'error'
                      ? 'rgba(220,38,38,0.1)'
                      : 'rgba(24,24,27,0.8)',
                  color: integration.sync_status === 'syncing'
                    ? '#f59e0b'
                    : integration.sync_status === 'error'
                      ? '#ef4444'
                      : '#71717a',
                }}
              >
                {integration.sync_status}
              </div>
            )}
          </div>
        )}

        {/* Row 4: Action buttons */}
        <div className="flex gap-2 mt-auto">
          {connected ? (
            <>
              {!provider.isExtension && (
                <button
                  onClick={() => onSync(provider.key)}
                  disabled={syncing === provider.key}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-50 flex-1"
                  style={{
                    background: `${provider.color}0d`,
                    border: `1px solid ${provider.color}22`,
                    color: provider.textColor,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${provider.color}1a`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${provider.color}0d`)}
                >
                  {syncing === provider.key
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />
                  }
                  {syncing === provider.key ? 'Syncing…' : 'Sync'}
                </button>
              )}
              <button
                onClick={() => integration && onDisconnect(integration)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{
                  background: 'rgba(220,38,38,0.05)',
                  border: '1px solid rgba(220,38,38,0.15)',
                  color: '#f87171',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.05)')}
              >
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => onConnect(provider.key)}
              disabled={connecting === provider.key}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
              style={{
                background: `${provider.color}0a`,
                border: `1px solid ${provider.color}22`,
                color: provider.textColor,
              }}
              onMouseEnter={e => {
                (e.currentTarget.style.background = `${provider.color}18`)
                ;(e.currentTarget.style.borderColor = `${provider.color}40`)
              }}
              onMouseLeave={e => {
                (e.currentTarget.style.background = `${provider.color}0a`)
                ;(e.currentTarget.style.borderColor = `${provider.color}22`)
              }}
            >
              {connecting === provider.key
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <span style={{ color: provider.color }}>{provider.logo(15)}</span>
              }
              {provider.isExtension
                ? 'Install Extension'
                : connecting === provider.key
                  ? 'Connecting…'
                  : `Connect ${provider.label}`
              }
              {!connecting && <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Hub diagram ────────────────────────────────────────────── */
function HubDiagram({
  integrations, totalSources,
}: { integrations: Integration[]; totalSources: number }) {
  const activeCount = integrations.filter(i => i.is_active).length
  const totalChunks = integrations.reduce((acc, i) => acc + (i.total_chunks || 0), 0)
  const pct = totalSources > 0 ? (activeCount / totalSources) * 100 : 0
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div
      className="rounded-2xl p-5 mb-6 relative overflow-hidden"
      style={{
        background: 'rgba(9,9,11,0.7)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative flex items-center gap-6">
        {/* Left: source list */}
        <div className="flex-shrink-0 hidden sm:block" style={{ minWidth: '110px' }}>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-dark-700 mb-2">Sources</p>
          <div className="flex flex-col gap-1.5">
            {PROVIDERS.filter(p => !p.isExtension).map(p => {
              const active = integrations.some(i => i.provider === p.apiKey && i.is_active)
              return (
                <div key={p.key} className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-700"
                    style={{
                      background: active ? p.color : '#27272a',
                      boxShadow: active ? `0 0 5px ${p.color}` : 'none',
                    }}
                  />
                  <span className="text-[10px]" style={{ color: active ? '#a1a1aa' : '#3f3f46' }}>{p.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center: animated wire bundle */}
        <div className="flex-1 relative overflow-hidden" style={{ height: '80px' }}>
          {[0, 1, 2, 3, 4].map(lane => (
            <div
              key={lane}
              className="absolute left-0 right-0"
              style={{
                top: `${12 + lane * 12}px`,
                height: '1px',
                background: 'rgba(255,255,255,0.03)',
                overflow: 'hidden',
              }}
            >
              {activeCount > 0 && (
                <div
                  className="absolute h-full"
                  style={{
                    width: '30%',
                    background: `linear-gradient(90deg, transparent, ${PROVIDERS[lane % 5].color}70, transparent)`,
                    animation: `intWireFlow 3.5s ease-in-out ${lane * 0.55}s infinite`,
                  }}
                />
              )}
            </div>
          ))}
          {/* Moving amber packet */}
          {activeCount > 0 && (
            <div
              className="absolute"
              style={{
                top: '38px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#d97706',
                boxShadow: '0 0 8px rgba(217,119,6,0.8)',
                animation: 'intHubPacket 3s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Right: context engine circle */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-dark-700 mb-1">Context Engine</p>
          <div className="relative w-16 h-16">
            <svg width="64" height="64" className="-rotate-90">
              <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" />
              <circle
                cx="32" cy="32" r={r}
                fill="none"
                stroke="#d97706"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{
                  transition: 'stroke-dasharray 1.2s ease',
                  filter: activeCount > 0 ? 'drop-shadow(0 0 4px rgba(217,119,6,0.5))' : 'none',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-white leading-none">{activeCount}</span>
              <span className="text-[9px] text-dark-600">/{totalSources}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 hidden md:flex flex-col gap-2" style={{ minWidth: '100px' }}>
          <div>
            <p className="text-[9px] text-dark-600 uppercase tracking-widest">Context chunks</p>
            <p className="text-lg font-bold text-white leading-tight">{formatChunks(totalChunks)}</p>
          </div>
          <div>
            <p className="text-[9px] text-dark-600 uppercase tracking-widest">Status</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: activeCount > 0 ? '#22c55e' : '#3f3f46',
                  boxShadow: activeCount > 0 ? '0 0 5px rgba(34,197,94,0.7)' : 'none',
                  animation: activeCount > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
              />
              <span className="text-[11px]" style={{ color: activeCount > 0 ? '#22c55e' : '#3f3f46' }}>
                {activeCount > 0 ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
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
      setTimeout(fetchIntegrations, 2000) // refresh after a moment
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
    <>
      <style>{`
        @keyframes intWireFlow {
          0%   { left: -35%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 135%; opacity: 0; }
        }
        @keyframes intPacket {
          0%   { left: 0%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes intHubPacket {
          0%   { left: 0%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes ctxFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-5xl" style={{ animation: 'ctxFadeIn 0.3s ease-out' }}>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
              <Zap className="w-3.5 h-3.5 text-brand" />
              <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Data Sources</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">Integrations</h1>
          <p className="text-dark-400 text-[15px]">
            Connect your tools — everything streams into one intelligent context engine.
            {!loading && (
              <span className="text-brand font-medium">
                {' '}{activeCount} of {totalSources} active.
              </span>
            )}
          </p>
        </div>

        {/* Hub diagram */}
        {!loading && (
          <HubDiagram integrations={integrations} totalSources={totalSources} />
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {PROVIDERS.map(p => (
              <div
                key={p.key}
                className="rounded-2xl animate-pulse"
                style={{
                  height: '240px',
                  background: 'rgba(24,24,27,0.4)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {PROVIDERS.map((p, i) => (
              <div
                key={p.key}
                style={{
                  animation: `ctxFadeIn 0.35s ease-out ${i * 0.06}s both`,
                }}
              >
                <ProviderCard
                  provider={p}
                  integration={getIntegration(p)}
                  connecting={connecting}
                  syncing={syncing}
                  onConnect={handleConnect}
                  onSync={handleSync}
                  onDisconnect={setDisconnecting}
                />
              </div>
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
    </>
  )
}
