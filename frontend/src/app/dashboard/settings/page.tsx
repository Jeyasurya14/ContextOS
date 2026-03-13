// frontend/src/app/dashboard/settings/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Copy, AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [newKey, setNewKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showClearContext, setShowClearContext] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  const handleGenerateKey = async () => {
    setGenerating(true)
    try {
      const res = await authApi.generateApiKey('Default Key')
      setNewKey(res.data.api_key)
      toast.success('API key generated!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to generate API key')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUpdateProfile = async () => {
    if (!name.trim()) return
    setUpdatingProfile(true)
    try {
      await authApi.updateProfile(name)
      toast.success('Profile updated!')
    } catch (err: any) {
      toast.error('Failed to update profile')
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleClearContext = async () => {
    try {
      await integrationsApi.clearAll()
      setShowClearContext(false)
      toast.success('All context cleared!')
    } catch (err: any) {
      toast.error('Failed to clear context')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await authApi.deleteAccount()
      logout()
      router.push('/login')
      toast.success('Account deleted')
    } catch (err: any) {
      toast.error('Failed to delete account')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-gray-400 text-sm mb-8">Manage your account and API keys.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-medium text-white mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
              <button
                onClick={handleUpdateProfile}
                disabled={updatingProfile || !name.trim() || name === user?.name}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {updatingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                Update
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <p className="text-sm text-gray-200">{user?.email || '—'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plan</label>
              <p className="text-sm text-gray-200 capitalize">{user?.plan || 'free'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-gray-400" />
            <h2 className="font-medium text-white">API Key</h2>
          </div>
          <button
            onClick={handleGenerateKey}
            disabled={generating}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {generating && <Loader2 className="w-4 h-4 animate-spin" />}
            {generating ? 'Generating...' : 'Generate New Key'}
          </button>
        </div>

        {newKey && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
            <p className="text-sm text-yellow-200 font-medium mb-2">
              Copy this key now — it will never be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-800 text-gray-100 px-3 py-2 rounded text-xs font-mono break-all">
                {newKey}
              </code>
              <button
                onClick={handleCopy}
                className="bg-gray-800 text-gray-200 px-3 py-2 rounded hover:bg-gray-700 transition text-sm flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h2 className="font-medium text-red-400">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-200">Clear all context</p>
              <p className="text-xs text-gray-400">Remove all synced context chunks from your account.</p>
            </div>
            <button
              onClick={() => setShowClearContext(true)}
              className="border border-red-900/50 text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition"
            >
              Clear Context
            </button>
          </div>
          <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-200">Delete account</p>
              <p className="text-xs text-gray-400">Permanently delete your account and all data.</p>
            </div>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="border border-red-900/50 text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearContext}
        onClose={() => setShowClearContext(false)}
        onConfirm={handleClearContext}
        title="Clear All Context"
        message="Are you sure you want to clear all synced context? This will remove all data from GitHub, Notion, Slack, and VS Code. You can re-sync later."
        confirmLabel="Clear All"
        isDangerous
      />

      <ConfirmModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone. All your data, integrations, and context will be permanently deleted."
        confirmText="DELETE"
        confirmLabel="Delete Account"
        isDangerous
      />
    </div>
  )
}
