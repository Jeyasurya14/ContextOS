// frontend/src/app/dashboard/settings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Copy, AlertTriangle, Loader2, Trash2, Sparkles, CheckCircle2, User, Shield, Eye, EyeOff } from 'lucide-react'
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
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    setName(user?.name || '')
  }, [user?.name])

  const handleGenerateKey = async () => {
    setGenerating(true)
    try {
      const res = await authApi.generateApiKey('Default Key')
      setNewKey(res.data.api_key)
      setShowKey(true)
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
    <div className="max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Settings</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Settings</h1>
        <p className="text-dark-400 text-[15px]">Manage your account and API keys</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card mb-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
            <User className="w-5 h-5 text-brand" />
          </div>
          <h2 className="font-semibold text-white text-lg">Profile</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm text-dark-400 mb-2 font-medium">Name</label>
            <div className="flex gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-premium flex-1"
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

          <div className="grid grid-cols-2 gap-5 pt-2">
            <div className="p-4 rounded-xl bg-dark-800/30 border border-dark-800/40">
              <label className="block text-xs text-dark-500 mb-1 font-medium uppercase tracking-wider">Email</label>
              <p className="text-sm text-dark-200 font-medium">{user?.email || '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/30 border border-dark-800/40">
              <label className="block text-xs text-dark-500 mb-1 font-medium uppercase tracking-wider">Plan</label>
              <p className="text-sm text-dark-200 capitalize font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand" />
                {user?.plan || 'free'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <div className="glass-card mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
              <Key className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-lg">API Key</h2>
              <p className="text-xs text-dark-500">For VS Code extension & external access</p>
            </div>
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
          <div className="rounded-xl border border-warning/20 overflow-hidden animate-slide-up">
            <div className="bg-warning/5 px-4 py-3 border-b border-warning/10">
              <p className="text-sm text-warning font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Copy this key now — it will never be shown again.
              </p>
            </div>
            <div className="p-4 bg-dark-900/50">
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-dark-800/80 text-dark-200 px-4 py-3 rounded-xl text-xs font-mono break-all border border-dark-700/40">
                  {showKey ? newKey : '•'.repeat(40)}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="btn btn-secondary text-sm !px-3"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary text-sm"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="glass-card animate-slide-up relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
        {/* Red gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-danger to-transparent" />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center border border-danger/20">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h2 className="font-semibold text-danger text-lg">Danger Zone</h2>
            <p className="text-xs text-dark-500">Irreversible actions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/20 border border-dark-800/30 hover:border-danger/20 transition-all duration-200 group">
            <div>
              <p className="text-sm text-dark-200 font-medium">Clear all context</p>
              <p className="text-xs text-dark-500 mt-0.5">Remove all synced context chunks from your account</p>
            </div>
            <button
              onClick={() => setShowClearContext(true)}
              className="btn btn-secondary text-danger border-dark-700/60 hover:border-danger/30 text-sm"
            >
              Clear Context
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/20 border border-dark-800/30 hover:border-danger/20 transition-all duration-200 group">
            <div>
              <p className="text-sm text-dark-200 font-medium">Delete account</p>
              <p className="text-xs text-dark-500 mt-0.5">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="btn btn-secondary text-danger border-dark-700/60 hover:border-danger/30 text-sm"
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
