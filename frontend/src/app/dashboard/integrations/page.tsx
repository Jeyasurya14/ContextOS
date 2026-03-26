// frontend/src/app/dashboard/integrations/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Unlink, Sparkles, CheckCircle2, Circle } from 'lucide-react'
import { integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { IntegrationCardSkeleton } from '@/components/ui/Skeleton'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// Real integration logos with fallbacks
const githubLogo = 'https://github.com/github.png?size=32'
const notionLogo = 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png'
const slackLogo = 'https://cdn.icon-icons.com/icons2/2415/PNG/512/slack_original_logo_icon_146308.png'
const vscodeLogo = 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35.1_icon.svg'
const linearLogo = 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Linear_logo_%282023%29.svg'
const googleDriveLogo = 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg'

// Fallback component for failed image loads
const LogoImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div className={`flex items-center justify-center text-xs font-bold text-white bg-dark-700 rounded ${className}`}>
        {alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  )
}

const providers = [
  { key: 'github', label: 'GitHub', logo: githubLogo, desc: 'Commits, PRs, issues, code', gradient: 'from-purple-500/10 to-purple-900/5' },
  { key: 'notion', label: 'Notion', logo: notionLogo, desc: 'Pages, databases, docs', gradient: 'from-white/5 to-gray-900/5' },
  { key: 'slack', label: 'Slack', logo: slackLogo, desc: 'Channels, messages, threads', gradient: 'from-pink-500/10 to-purple-900/5' },
  { key: 'linear', label: 'Linear', logo: linearLogo, desc: 'Issues, projects, teams', gradient: 'from-indigo-500/10 to-indigo-900/5' },
  { key: 'google', label: 'Google Drive', logo: googleDriveLogo, desc: 'Docs, Sheets, Slides', gradient: 'from-blue-500/10 to-blue-900/5' },
  { key: 'vscode', label: 'VS Code', logo: vscodeLogo, desc: 'Workspace files (via extension)', gradient: 'from-sky-500/10 to-sky-900/5' },
]

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<any>(null)

  useEffect(() => {
    fetchIntegrations()

    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const username = urlParams.get('username')
    const workspace = urlParams.get('workspace')
    const team = urlParams.get('team')

    if (success) {
      const name = username || workspace || team || success
      toast.success(`Successfully connected ${success.toUpperCase()}${name !== success ? `: ${name}` : ''}!`)
      window.history.replaceState({}, '', '/dashboard/integrations')
    } else if (error) {
      toast.error(`Failed to connect ${error.toUpperCase()}. Please try again.`)
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
  }, [toast])

  const fetchIntegrations = async () => {
    setLoading(true)
    try {
      const res = await integrationsApi.getAll()
      setIntegrations(res.data || [])
    } catch (err: any) {
      toast.error('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (tool: 'github' | 'notion' | 'slack') => {
    setConnecting(tool)
    try {
      let res
      if (tool === 'github') {
        res = await integrationsApi.getGithubUrl()
      } else if (tool === 'notion') {
        res = await integrationsApi.getNotionUrl()
      } else if (tool === 'slack') {
        res = await integrationsApi.getSlackUrl()
      } else if (tool === 'linear') {
        res = await integrationsApi.getLinearUrl()
      } else if (tool === 'google') {
        res = await integrationsApi.getGoogleUrl()
      }
      if (res?.data?.url) {
        window.location.href = res.data.url
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || `Failed to connect ${tool}`)
    } finally {
      setConnecting(null)
    }
  }

  const handleSync = async (tool: string) => {
    setSyncing(tool)
    try {
      if (tool === 'github') {
        await integrationsApi.syncGithub()
      } else if (tool === 'linear') {
        await integrationsApi.syncLinear()
      } else if (tool === 'google') {
        await integrationsApi.syncGoogle()
      } else {
        const { default: api } = await import('@/lib/api')
        await api.post(`/api/v1/integrations/${tool}/sync`)
      }
      toast.success('Sync completed successfully!')
      fetchIntegrations()
    } catch (err: any) {
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
    } catch (err: any) {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  const getIntegration = (key: string) => integrations.find(i => i.provider === key)
  const connectedCount = integrations.filter(i => i.is_active).length

  if (loading) {
    return (
      <div className="max-w-5xl animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Integrations</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Integrations</h1>
          <p className="text-dark-400 text-[15px]">Connect your tools to build context.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <IntegrationCardSkeleton />
          <IntegrationCardSkeleton />
          <IntegrationCardSkeleton />
          <IntegrationCardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Integrations</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Integrations</h1>
        <p className="text-dark-400 text-[15px]">
          Connect your tools to build context · <span className="text-brand font-medium">{connectedCount} connected</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {providers.map((p, idx) => {
          const integration = getIntegration(p.key)
          const connected = integration?.is_active || false
          return (
            <div
              key={p.key}
              className={`glass-card animate-slide-up group relative overflow-hidden ${
                connected ? 'border-success/20' : ''
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Subtle gradient background per provider */}
              <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-30 pointer-events-none`} />

              <div className="relative">
                <div className="flex items-start gap-4 mb-5">
                  <div className={`p-3 rounded-xl border transition-all duration-300 ${
                    connected
                      ? 'bg-success/10 border-success/20 shadow-glow-success'
                      : 'bg-dark-800/60 border-dark-700/40 group-hover:border-dark-600/60'
                  }`}>
                    <LogoImage
                      src={p.logo}
                      alt={p.label}
                      className={`w-6 h-6 transition-all duration-300 ${connected ? '' : 'opacity-50 group-hover:opacity-80'}`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{p.label}</h3>
                      {connected && (
                        <span className="badge badge-success text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dark-400">{p.desc}</p>
                    {connected && integration?.provider_username && (
                      <p className="text-xs text-dark-500 mt-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        @{integration.provider_username}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5">
                  {connected ? (
                    <>
                      {(p.key === 'notion' || p.key === 'slack' || p.key === 'github' || p.key === 'linear' || p.key === 'google') && (
                        <button
                          onClick={() => handleSync(p.key)}
                          disabled={syncing === p.key}
                          className="btn btn-secondary text-brand disabled:opacity-50 text-sm"
                        >
                          {syncing === p.key ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          {syncing === p.key ? 'Syncing...' : 'Sync'}
                        </button>
                      )}
                      <button
                        onClick={() => setDisconnecting(integration)}
                        className="btn btn-secondary text-danger hover:text-danger hover:border-danger/30 text-sm"
                      >
                        <Unlink className="w-4 h-4" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (p.key === 'vscode') {
                          window.open('https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot', '_blank')
                        } else {
                          handleConnect(p.key as any)
                        }
                      }}
                      disabled={connecting === p.key}
                      className="btn btn-primary disabled:opacity-50 text-sm"
                    >
                      {connecting === p.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogoImage src={p.logo} alt={p.label} className="w-4 h-4" />
                      )}
                      {p.key === 'vscode' ? 'Install Extension' : connecting === p.key ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        isOpen={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        onConfirm={handleDisconnect}
        title="Disconnect Integration"
        message={`Are you sure you want to disconnect ${disconnecting?.provider}? All synced data will remain but new data won't be synced.`}
        confirmLabel="Disconnect"
        isDangerous
      />
    </div>
  )
}
