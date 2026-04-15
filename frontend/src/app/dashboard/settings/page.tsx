// frontend/src/app/dashboard/settings/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Key, Copy, AlertTriangle, Loader2, Trash2, CheckCircle2, User, Eye, EyeOff,
  Shield, Terminal, Plug, RefreshCw, ExternalLink, Code2, Zap, RotateCcw
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ─── Sub-components ────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, label, danger }: {
  active: boolean; onClick: () => void
  icon: any; label: string; danger?: boolean
}) {
  const color = danger ? '#f87171' : active ? '#f59e0b' : '#71717a'
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
      style={{
        background: active
          ? danger ? 'rgba(248,113,113,0.08)' : 'rgba(245,158,11,0.09)'
          : 'transparent',
        border: `1px solid ${active
          ? danger ? 'rgba(248,113,113,0.24)' : 'rgba(245,158,11,0.24)'
          : 'transparent'}`,
        color,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

function Section({ title, subtitle, icon: Icon, iconColor = '#d97706', children }: {
  title: string; subtitle?: string; icon: any; iconColor?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(15,15,17,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}12`, border: `1px solid ${iconColor}22` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">{title}</p>
          {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="text-[10.5px] text-zinc-500 font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] text-zinc-300 font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
      style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
      {n}
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

type Tab = 'account' | 'apikeys' | 'extension' | 'danger'

interface KeyStatus {
  has_key: boolean
  prefix: string | null
  name: string | null
  created_at: string | null
}

export default function SettingsPage() {
  const { user, logout, setUser } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('account')
  const [name, setName] = useState(user?.name || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // API key state
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Modals
  const [showClearContext, setShowClearContext] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [showRevokeKey, setShowRevokeKey] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://contextos-api-jxdr.onrender.com'

  useEffect(() => { setName(user?.name || '') }, [user?.name])

  const loadKeyStatus = useCallback(async () => {
    try {
      setLoadingStatus(true)
      const res = await authApi.getApiKeyStatus()
      setKeyStatus(res.data)
    } catch {
      setKeyStatus({ has_key: false, prefix: null, name: null, created_at: null })
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => { loadKeyStatus() }, [loadKeyStatus])

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
      const res = await authApi.generateApiKey('VS Code Extension Key')
      setNewKey(res.data.api_key)
      setShowKey(true)
      toast.success('New API key generated!')
      await loadKeyStatus()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to generate key') }
    finally { setGenerating(false) }
  }

  const handleRevokeKey = async () => {
    setRevoking(true)
    try {
      await authApi.revokeApiKey()
      setKeyStatus({ has_key: false, prefix: null, name: null, created_at: null })
      setNewKey(null)
      toast.success('API key revoked')
    } catch { toast.error('Failed to revoke key') }
    finally { setRevoking(false); setShowRevokeKey(false) }
  }

  const handleCopy = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    toast.success('API key copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(API_URL)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleClearContext = async () => {
    try { await integrationsApi.clearAll(); setShowClearContext(false); toast.success('Context cleared!') }
    catch { toast.error('Failed to clear context') }
  }

  const handleDeleteAccount = async () => {
    try { await authApi.deleteAccount(); logout(); router.push('/login'); toast.success('Account deleted') }
    catch { toast.error('Failed to delete account') }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Unknown'
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <>
      <style>{`
        @keyframes stFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        .skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.8s infinite; border-radius: 6px; }
      `}</style>
      <div className="max-w-3xl" style={{ animation: 'stFade 0.3s ease-out' }}>

        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}>
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">Settings</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your account, API access, and extension setup</p>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
          <TabButton active={tab === 'account'} onClick={() => setTab('account')} icon={User} label="Account" />
          <TabButton active={tab === 'apikeys'} onClick={() => setTab('apikeys')} icon={Key} label="API Keys" />
          <TabButton active={tab === 'extension'} onClick={() => setTab('extension')} icon={Plug} label="Extension" />
          <TabButton active={tab === 'danger'} onClick={() => setTab('danger')} icon={AlertTriangle} label="Danger Zone" danger />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: Account
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'account' && (
          <div className="space-y-4" style={{ animation: 'stFade 0.2s ease-out' }}>
            <Section title="Profile" subtitle="Your public information" icon={User}>
              <div className="space-y-5">
                {/* Avatar row */}
                <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 0 0 3px rgba(217,119,6,0.15)' }}>
                    {user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{user?.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Zap className="w-2.5 h-2.5" />
                      {user?.plan ?? 'free'}
                    </span>
                  </div>
                </div>

                {/* Edit name */}
                <div>
                  <label className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Display Name</label>
                  <div className="flex gap-2.5">
                    <input value={name} onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateProfile()}
                      placeholder="Your name"
                      className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-black/30 border text-white placeholder-zinc-700 outline-none transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(245,158,11,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')} />
                    <button onClick={handleUpdateProfile}
                      disabled={updatingProfile || !name.trim() || name === user?.name}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                      {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>

                <div>
                  <InfoRow label="Email" value={user?.email || '—'} />
                  <InfoRow label="Plan" value={(user?.plan ?? 'free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)} />
                  <InfoRow label="Member since" value={user?.created_at ? formatDate(user.created_at as any) : '—'} />
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: API Keys
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'apikeys' && (
          <div className="space-y-4" style={{ animation: 'stFade 0.2s ease-out' }}>
            <Section title="API Keys" subtitle="Secure tokens for external access" icon={Key}>
              <div className="space-y-5">
                <p className="text-[12px] text-zinc-500 leading-relaxed">
                  Your API key authenticates the VS Code extension and any direct API calls.
                  Only one key is active at a time — generating a new one revokes the previous one.
                </p>

                {/* Current key card */}
                <div>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Current Key</p>
                  {loadingStatus ? (
                    <div className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="skel h-4 w-40 mb-2" />
                      <div className="skel h-3 w-24" />
                    </div>
                  ) : keyStatus?.has_key ? (
                    <div className="rounded-xl p-4 flex items-center justify-between gap-3"
                      style={{ border: '1px solid rgba(245,158,11,0.18)', background: 'rgba(245,158,11,0.04)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <Key className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{keyStatus.name || 'Default Key'}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                            {keyStatus.prefix}••••••••••••••••••••••••••
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            Created {formatDate(keyStatus.created_at)}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setShowRevokeKey(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                        style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.14)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.07)')}>
                        <Trash2 className="w-3 h-3" />
                        Revoke
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl p-4 flex items-center gap-3"
                      style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <Key className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">No active API key</p>
                        <p className="text-[11px] text-zinc-600">Generate one below to get started</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <button onClick={handleGenerateKey} disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 w-full justify-center"
                  style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.22)', color: '#f59e0b' }}
                  onMouseEnter={e => { if (!generating) e.currentTarget.style.background = 'rgba(245,158,11,0.15)' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.09)')}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {keyStatus?.has_key ? 'Rotate API Key' : 'Generate API Key'}
                </button>

                {/* New key one-time reveal */}
                {newKey && (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.22)' }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b"
                      style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.12)' }}>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-[11px] text-amber-400 font-semibold">Copy this key now — it will never be shown again.</p>
                    </div>
                    <div className="p-3 flex gap-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <code className="flex-1 px-3 py-2.5 rounded-xl text-[11px] font-mono border text-zinc-400 break-all select-all"
                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        {showKey ? newKey : '•'.repeat(Math.min(newKey.length, 52))}
                      </code>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => setShowKey(!showKey)} title={showKey ? 'Hide' : 'Reveal'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={handleCopy} title="Copy to clipboard"
                          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: copied ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${copied ? 'rgba(22,163,74,0.25)' : 'rgba(255,255,255,0.07)'}`,
                            color: copied ? '#22c55e' : '#71717a'
                          }}>
                          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* API Base URL */}
            <Section title="API Base URL" subtitle="Use this in your extension or scripts" icon={Code2}>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3.5 py-2.5 rounded-xl text-[12px] font-mono border text-zinc-400 truncate"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  {API_URL}
                </code>
                <button onClick={handleCopyUrl}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    background: copiedUrl ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${copiedUrl ? 'rgba(22,163,74,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    color: copiedUrl ? '#22c55e' : '#71717a',
                  }}>
                  {copiedUrl ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </Section>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Extension
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'extension' && (
          <div className="space-y-4" style={{ animation: 'stFade 0.2s ease-out' }}>
            {/* Extension card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(15,15,17,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
              <div className="p-5 flex items-center justify-between gap-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(217,119,6,0.06))', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Terminal className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">ContextOS Copilot</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">VS Code Extension · v2.1.0</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-emerald-500 font-medium">Published on Marketplace</span>
                    </div>
                  </div>
                </div>
                <a href="https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.22)', color: '#f59e0b' }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  Install
                </a>
              </div>

              {/* Connect guide */}
              <div className="p-5">
                <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-4">
                  Setup Guide
                </p>
                <div className="space-y-3.5">
                  {[
                    {
                      step: 1,
                      title: 'Install the extension',
                      desc: 'Search for "ContextOS" in the VS Code Extensions panel or install from the Marketplace.',
                      code: 'ext install JeyaSuryaM.contextos-copilot',
                    },
                    {
                      step: 2,
                      title: 'Generate an API key',
                      desc: 'Go to the API Keys tab and click Generate. Copy the key — it\'s shown only once.',
                    },
                    {
                      step: 3,
                      title: 'Set the key in VS Code',
                      desc: 'Open the Command Palette and run:',
                      code: 'ContextOS: Set API Key',
                    },
                    {
                      step: 4,
                      title: 'Start chatting',
                      desc: 'Click the ContextOS icon in the Activity Bar. Ask anything about your workspace!',
                      code: 'ContextOS: Open Assistant',
                    },
                  ].map(item => (
                    <div key={item.step} className="flex gap-3.5">
                      <StepBadge n={item.step} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white">{item.title}</p>
                        <p className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">{item.desc}</p>
                        {item.code && (
                          <div className="mt-2 px-3 py-1.5 rounded-lg flex items-center gap-2"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Terminal className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <code className="text-[11px] font-mono text-zinc-400">{item.code}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Commands reference */}
            <Section title="Extension Commands" subtitle="Available in the Command Palette (Ctrl+Shift+P)" icon={Code2}>
              <div className="space-y-1.5">
                {[
                  { cmd: 'ContextOS: Set API Key', desc: 'Securely store your API key in VS Code' },
                  { cmd: 'ContextOS: Send Code to Chat', desc: 'Send highlighted code to the assistant' },
                  { cmd: 'ContextOS: Explain Current File', desc: 'Get an explanation of the open file' },
                  { cmd: 'ContextOS: Find Bugs in Code', desc: 'Scan selection or file for issues' },
                  { cmd: 'ContextOS: Open Settings', desc: 'Quick-access extension settings' },
                  { cmd: 'ContextOS: Clear Cache', desc: 'Reset the local response cache' },
                  { cmd: 'ContextOS: Show Stats', desc: 'View rate-limit & health stats' },
                ].map(item => (
                  <div key={item.cmd} className="flex items-start gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <code className="text-[11px] font-mono text-amber-400 whitespace-nowrap pt-0.5">{item.cmd}</code>
                    <span className="text-[11.5px] text-zinc-500 ml-auto text-right">{item.desc}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Danger Zone
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'danger' && (
          <div style={{ animation: 'stFade 0.2s ease-out' }}>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(15,15,17,0.9)', border: '1px solid rgba(220,38,38,0.18)', backdropFilter: 'blur(12px)' }}>
              <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(220,38,38,0.5),transparent)' }} />
              <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(220,38,38,0.1)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-red-400">Danger Zone</p>
                  <p className="text-[10px] text-zinc-600">These actions are irreversible — proceed with caution</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[
                  {
                    icon: RotateCcw,
                    label: 'Clear all synced context',
                    desc: 'Remove all context from GitHub, Notion, Slack, and VS Code. You can re-sync later.',
                    action: () => setShowClearContext(true),
                    btnLabel: 'Clear Context',
                    isDanger: false,
                  },
                  {
                    icon: Trash2,
                    label: 'Delete my account',
                    desc: 'Permanently delete your account, API keys, and all associated data. This cannot be undone.',
                    action: () => setShowDeleteAccount(true),
                    btnLabel: 'Delete Account',
                    isDanger: true,
                  },
                ].map(item => (
                  <div key={item.label}
                    className="flex items-center justify-between p-4 rounded-xl transition-all gap-4"
                    style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.08)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(220,38,38,0.18)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(220,38,38,0.08)')}>
                    <div className="flex items-start gap-3">
                      <item.icon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-zinc-200 font-medium">{item.label}</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <button onClick={item.action}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-all"
                      style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)', color: '#f87171' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.14)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.07)')}>
                      {item.btnLabel}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Modals ── */}
        <ConfirmModal isOpen={showRevokeKey} onClose={() => setShowRevokeKey(false)}
          onConfirm={handleRevokeKey}
          title="Revoke API Key"
          message="The current API key will stop working immediately. The VS Code extension will require a new key to connect."
          confirmLabel={revoking ? 'Revoking…' : 'Revoke Key'}
          isDangerous />

        <ConfirmModal isOpen={showClearContext} onClose={() => setShowClearContext(false)}
          onConfirm={handleClearContext}
          title="Clear All Context"
          message="Remove all synced context from GitHub, Notion, Slack, and VS Code? You can re-sync anytime."
          confirmLabel="Clear All"
          isDangerous />

        <ConfirmModal isOpen={showDeleteAccount} onClose={() => setShowDeleteAccount(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Permanently delete your account and all data? This cannot be undone."
          confirmText="DELETE"
          confirmLabel="Delete Account"
          isDangerous />
      </div>
    </>
  )
}
