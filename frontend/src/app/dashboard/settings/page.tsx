// frontend/src/app/dashboard/settings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Copy, AlertTriangle, Loader2, Trash2, CheckCircle2, User, Eye, EyeOff, Mail, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

function Section({ title, subtitle, icon: Icon, iconColor = '#d97706', children }: {
  title: string; subtitle?: string; icon: any; iconColor?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${iconColor}10`, border: `1px solid ${iconColor}20` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">{title}</p>
          {subtitle && <p className="text-[10px] text-dark-600">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/4 last:border-0">
      <span className="text-[11px] text-dark-600 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-[12px] text-dark-300 font-medium">{value}</span>
    </div>
  )
}

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

  useEffect(() => { setName(user?.name || '') }, [user?.name])

  const handleUpdateProfile = async () => {
    if (!name.trim()) return
    setUpdatingProfile(true)
    try {
      const res = await authApi.updateProfile(name)
      setUser(res.data)
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update profile') }
    finally { setUpdatingProfile(false) }
  }

  const handleGenerateKey = async () => {
    setGenerating(true)
    try {
      const res = await authApi.generateApiKey('Default Key')
      setNewKey(res.data.api_key)
      setShowKey(true)
      toast.success('API key generated!')
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to generate key') }
    finally { setGenerating(false) }
  }

  const handleCopy = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClearContext = async () => {
    try { await integrationsApi.clearAll(); setShowClearContext(false); toast.success('Context cleared!') }
    catch { toast.error('Failed to clear context') }
  }

  const handleDeleteAccount = async () => {
    try { await authApi.deleteAccount(); logout(); router.push('/login'); toast.success('Account deleted') }
    catch { toast.error('Failed to delete account') }
  }

  return (
    <>
      <style>{`
        @keyframes stFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>
      <div className="max-w-3xl" style={{ animation: 'stFade 0.3s ease-out' }}>
        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}>
              <Shield className="w-3.5 h-3.5 text-brand" />
              <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">Settings</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-dark-500 text-sm mt-1">Manage your account, keys, and preferences</p>
        </div>

        <div className="space-y-4">
          {/* Profile */}
          <Section title="Profile" subtitle="Your public information" icon={User}>
            <div className="space-y-4">
              {/* Avatar + info */}
              <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-white font-semibold">{user?.name}</p>
                  <p className="text-[11px] text-dark-600 mt-0.5">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(217,119,6,0.1)', color: '#f59e0b', border: '1px solid rgba(217,119,6,0.2)' }}>
                    {user?.plan ?? 'free'}
                  </span>
                </div>
              </div>

              {/* Edit name */}
              <div>
                <label className="block text-[10px] text-dark-600 font-semibold uppercase tracking-wider mb-1.5">Display Name</label>
                <div className="flex gap-2.5">
                  <input value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdateProfile()}
                    placeholder="Your name"
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-dark-900/70 border border-white/7 text-white placeholder-dark-700 outline-none focus:border-brand/30 transition-colors" />
                  <button onClick={handleUpdateProfile}
                    disabled={updatingProfile || !name.trim() || name === user?.name}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                    {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>

              <div>
                <InfoRow label="Email" value={user?.email || '—'} />
                <InfoRow label="Plan" value={(user?.plan ?? 'free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)} />
              </div>
            </div>
          </Section>

          {/* API Key */}
          <Section title="API Key" subtitle="For VS Code extension & external access" icon={Key}>
            <div className="space-y-3">
              <p className="text-[12px] text-dark-600 leading-relaxed">
                Generate an API key to connect the VS Code extension or access the ContextOS API externally.
              </p>

              <button onClick={handleGenerateKey} disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.18)', color: '#f59e0b' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.08)')}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {newKey ? 'Regenerate Key' : 'Generate API Key'}
              </button>

              {newKey && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b"
                    style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.1)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                    <p className="text-[11px] text-yellow-400 font-medium">Save this key now — it won't be shown again.</p>
                  </div>
                  <div className="p-3 flex gap-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <code className="flex-1 px-3 py-2.5 rounded-xl text-[11px] font-mono bg-dark-900/80 border border-white/5 text-dark-300 break-all">
                      {showKey ? newKey : '•'.repeat(Math.min(newKey.length, 48))}
                    </code>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => setShowKey(!showKey)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-dark-500 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={handleCopy}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: copied ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.06)'}`, color: copied ? '#22c55e' : '#71717a' }}>
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Danger Zone */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(220,38,38,0.15)', backdropFilter: 'blur(12px)' }}>
            <div className="h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-900/20">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-red-400">Danger Zone</p>
                <p className="text-[10px] text-dark-600">Irreversible actions — proceed with caution</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                {
                  label: 'Clear all context', desc: 'Remove all synced data. You can re-sync later.',
                  action: () => setShowClearContext(true), btnLabel: 'Clear Context',
                },
                {
                  label: 'Delete account', desc: 'Permanently delete your account and all data.',
                  action: () => setShowDeleteAccount(true), btnLabel: 'Delete Account', isDanger: true,
                },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-xl transition-all"
                  style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(220,38,38,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(220,38,38,0.08)')}>
                  <div>
                    <p className="text-sm text-dark-200 font-medium">{item.label}</p>
                    <p className="text-[11px] text-dark-600 mt-0.5">{item.desc}</p>
                  </div>
                  <button onClick={item.action}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 ml-4 transition-all"
                    style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)', color: '#f87171' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.07)')}>
                    {item.isDanger && <Trash2 className="w-3.5 h-3.5" />}
                    {item.btnLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ConfirmModal isOpen={showClearContext} onClose={() => setShowClearContext(false)}
          onConfirm={handleClearContext}
          title="Clear All Context"
          message="Remove all synced context from GitHub, Notion, Slack, and VS Code? You can re-sync later."
          confirmLabel="Clear All" isDangerous />
        <ConfirmModal isOpen={showDeleteAccount} onClose={() => setShowDeleteAccount(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Permanently delete your account and all data? This cannot be undone."
          confirmText="DELETE" confirmLabel="Delete Account" isDangerous />
      </div>
    </>
  )
}
