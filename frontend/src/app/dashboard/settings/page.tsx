// frontend/src/app/dashboard/settings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Copy, AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export default function SettingsPage() {
  const { user, logout, setUser } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [newKey, setNewKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showClearContext, setShowClearContext] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  useEffect(() => {
    setName(user?.name || '')
  }, [user?.name])

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
      const res = await authApi.updateProfile(name)
      setUser(res.data)
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
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-white mb-2">Settings</h1>
      <p className="text-dark-400 text-sm mb-8">Manage your account and API keys</p>

      <div className="card mb-6 animate-slide-up">
        <h2 className="font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-400 mb-1">Name</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand/50 transition"
              />
              <button
                onClick={handleUpdateProfile}
                disabled={updatingProfile || !name.trim() || name === user?.name}
                className="btn btn-primary disabled:opacity-50"
              >
                {updatingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                Update
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Email</label>
              <p className="text-sm text-dark-200">{user?.email || '—'}</p>
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Plan</label>
              <p className="text-sm text-dark-200 capitalize">{user?.plan || 'free'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-dark-300" />
            <h2 className="font-semibold text-white">API Key</h2>
          </div>
          <button
            onClick={handleGenerateKey}
            disabled={generating}
            className="btn btn-primary disabled:opacity-50 text-sm"
          >
            {generating && <Loader2 className="w-4 h-4 animate-spin" />}
            {newKey ? 'Generate New' : 'Generate API Key'}
          </button>
        </div>

        {newKey && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <p className="text-sm text-warning font-medium mb-2">
              Copy this key now — it will never be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-dark-800 text-dark-200 px-3 py-2 rounded text-xs font-mono break-all border border-dark-700">
                {newKey}
              </code>
              <button
                onClick={handleCopy}
                className="btn btn-secondary text-sm"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card border-danger/30 bg-danger/5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-danger" />
          <h2 className="font-semibold text-danger">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-200">Clear all context</p>
              <p className="text-xs text-dark-400">Remove all synced context chunks from your account</p>
            </div>
            <button
              onClick={() => setShowClearContext(true)}
              className="btn btn-secondary text-danger border-dark-700 hover:border-danger/50 hover:text-danger text-sm"
            >
              Clear Context
            </button>
          </div>
          <div className="border-t border-dark-800 pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-200">Delete account</p>
              <p className="text-xs text-dark-400">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="btn btn-secondary text-danger border-dark-700 hover:border-danger/50 hover:text-danger text-sm"
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
