'use client'

import { useEffect, useState } from 'react'
import { Search, Github, FileText, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '@/lib/api'

interface Integration {
  id: string
  user_id: string
  provider: string
  provider_username: string | null
  is_active: boolean
  total_chunks: number
  sync_status: string
  last_synced_at: string | null
  created_at: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit] = useState(20)
  const [providerFilter, setProviderFilter] = useState<string>('')

  useEffect(() => {
    loadIntegrations()
  }, [page, providerFilter])

  const loadIntegrations = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit,
        offset: page * limit,
      }
      if (providerFilter) params.provider = providerFilter

      const { data } = await adminApi.getIntegrations(params)
      setIntegrations(data.integrations)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load integrations:', err)
    } finally {
      setLoading(false)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'github':
        return <Github className="w-5 h-5" />
      case 'notion':
        return <FileText className="w-5 h-5" />
      case 'slack':
        return <MessageSquare className="w-5 h-5" />
      default:
        return null
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
          <p className="text-dark-400">Monitor all user integrations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand/10 rounded-lg">
              <Github className="w-5 h-5 text-brand" />
            </div>
            <span className="text-dark-400 text-sm">GitHub</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {integrations.filter(i => i.provider === 'github').length}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success/10 rounded-lg">
              <FileText className="w-5 h-5 text-success" />
            </div>
            <span className="text-dark-400 text-sm">Notion</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {integrations.filter(i => i.provider === 'notion').length}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warning/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-warning" />
            </div>
            <span className="text-dark-400 text-sm">Slack</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {integrations.filter(i => i.provider === 'slack').length}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-dark-400 text-sm">Total Chunks</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {integrations.reduce((sum, i) => sum + i.total_chunks, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <select
            value={providerFilter}
            onChange={(e) => {
              setProviderFilter(e.target.value)
              setPage(0)
            }}
            className="input max-w-xs"
          >
            <option value="">All Providers</option>
            <option value="github">GitHub</option>
            <option value="notion">Notion</option>
            <option value="slack">Slack</option>
          </select>
        </div>
      </div>

      {/* Integrations Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800">
                <th className="text-left p-4 text-sm font-medium text-dark-400">Provider</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">User ID</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Username</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Chunks</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Sync Status</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Last Synced</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-dark-400">
                    Loading integrations...
                  </td>
                </tr>
              ) : integrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-dark-400">
                    No integrations found
                  </td>
                </tr>
              ) : (
                integrations.map((integration) => (
                  <tr key={integration.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getProviderIcon(integration.provider)}
                        <span className="text-white capitalize">{integration.provider}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-dark-400 text-sm font-mono">
                        {integration.user_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="p-4 text-white">
                      {integration.provider_username || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${integration.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {integration.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-white">
                      {integration.total_chunks.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        integration.sync_status === 'completed' ? 'badge-success' :
                        integration.sync_status === 'in_progress' ? 'badge-warning' :
                        integration.sync_status === 'failed' ? 'badge-danger' :
                        'badge-neutral'
                      }`}>
                        {integration.sync_status}
                      </span>
                    </td>
                    <td className="p-4 text-dark-400 text-sm">
                      {integration.last_synced_at
                        ? new Date(integration.last_synced_at).toLocaleString()
                        : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-800">
            <div className="text-sm text-dark-400">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} integrations
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="btn btn-secondary disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-dark-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
