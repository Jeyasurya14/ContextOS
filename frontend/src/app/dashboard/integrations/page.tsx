// frontend/src/app/dashboard/integrations/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Github, FileText, MessageSquare, Loader2, CheckCircle, XCircle, RefreshCw, Code2, Unlink } from 'lucide-react'
import { integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { IntegrationCardSkeleton } from '@/components/ui/Skeleton'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const providers = [
  { key: 'github', label: 'GitHub', icon: Github, color: 'text-white', desc: 'Commits, PRs, issues, code' },
  { key: 'notion', label: 'Notion', icon: FileText, color: 'text-white', desc: 'Pages, databases, docs' },
  { key: 'slack', label: 'Slack', icon: MessageSquare, color: 'text-purple-400', desc: 'Channels, messages, threads' },
  { key: 'vscode', label: 'VS Code', icon: Code2, color: 'text-blue-400', desc: 'Workspace files (via extension)' },
]

export default function IntegrationsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<any>(null)

  useEffect(() => {
    fetchIntegrations()
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const username = searchParams.get('username')
    const workspace = searchParams.get('workspace')
    const team = searchParams.get('team')
    
    if (success) {
      const name = username || workspace || team || success
      toast.success(`Successfully connected ${success.toUpperCase()}${name !== success ? `: ${name}` : ''}!`)
      window.history.replaceState({}, '', '/dashboard/integrations')
    } else if (error) {
      toast.error(`Failed to connect ${error.toUpperCase()}. Please try again.`)
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
  }, [searchParams, toast])

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
      let response
      if (tool === 'github') response = await integrationsApi.getGithubUrl()
      if (tool === 'notion') response = await integrationsApi.getNotionUrl()
      if (tool === 'slack') response = await integrationsApi.getSlackUrl()
      if (response?.data?.oauth_url) {
        window.location.href = response.data.oauth_url
      }
    } catch (err: any) {
      toast.error(`Failed to connect ${tool}. Check your .env credentials.`)
      setConnecting(null)
    }
  }

  const handleSync = async (tool: string) => {
    setSyncing(tool)
    try {
      if (tool === 'github') {
        const response = await integrationsApi.syncGithub()
        toast.success(`Synced ${response.data.repos_synced} repos with ${response.data.total_chunks} chunks!`)
      } else {
        toast.info(`${tool} sync not yet implemented`)
      }
      setTimeout(() => fetchIntegrations(), 2000)
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || 'Sync failed. Try again.'
      toast.error(errorMsg)
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async () => {
    if (!disconnecting) return
    try {
      await integrationsApi.disconnect(disconnecting.provider)
      setIntegrations((prev) => prev.filter((i) => i.provider !== disconnecting.provider))
      setDisconnecting(null)
      toast.success('Integration disconnected')
    } catch (err: any) {
      toast.error('Failed to disconnect')
    }
  }

  const getIntegration = (key: string) => {
    return integrations.find((i) => i.provider?.toLowerCase() === key)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Integrations</h1>
      <p className="text-gray-400 text-sm mb-8">Connect your tools to build context.</p>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <IntegrationCardSkeleton />
          <IntegrationCardSkeleton />
          <IntegrationCardSkeleton />
          <IntegrationCardSkeleton />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {providers.map((p) => {
            const integration = getIntegration(p.key)
            const connected = integration?.is_active || false
            const syncStatus = integration?.sync_status
            return (
              <div key={p.key} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p.icon className={`w-6 h-6 ${p.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{p.label}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{p.desc}</p>
                    {connected && integration?.provider_username && (
                      <p className="text-xs text-gray-500 mt-1">@{integration.provider_username}</p>
                    )}
                    {connected && syncStatus && (
                      <p className={`text-xs mt-1 ${
                        syncStatus === 'synced' ? 'text-green-400' : 
                        syncStatus === 'syncing' ? 'text-yellow-400' : 
                        syncStatus === 'error' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {syncStatus === 'synced' && integration?.total_chunks > 0 
                          ? `${integration.total_chunks.toLocaleString()} chunks synced`
                          : syncStatus}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {connected ? (
                    <>
                      {(p.key === 'notion' || p.key === 'slack' || p.key === 'github') && (
                        <button
                          onClick={() => handleSync(p.key)}
                          disabled={syncing === p.key}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
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
                        className="flex items-center justify-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
                      >
                        <Unlink className="w-4 h-4" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => p.key !== 'vscode' && handleConnect(p.key as any)}
                      disabled={p.key === 'vscode' || connecting === p.key}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {connecting === p.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <p.icon className="w-4 h-4" />
                      )}
                      {p.key === 'vscode' ? 'Install Extension' : connecting === p.key ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

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
