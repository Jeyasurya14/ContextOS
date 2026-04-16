'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Key, Copy, AlertTriangle, Loader2, Trash2, CheckCircle2, User, Eye, EyeOff,
  Shield, Terminal, Plug, RefreshCw, ExternalLink, Code2, Zap, RotateCcw, Plus
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
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500, transition: 'all var(--t-fast)', whiteSpace: 'nowrap',
        background: active ? danger ? 'var(--danger-muted)' : 'var(--bg-surface)' : 'transparent',
        border: `1px solid ${active ? danger ? 'var(--danger-border)' : 'var(--border-base)' : 'transparent'}`,
        color: danger ? 'var(--danger-text)' : active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer'
      }}
      onMouseEnter={e => { if(!active) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = danger ? 'var(--danger-text)' : 'var(--text-primary)' } }}
      onMouseLeave={e => { if(!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
    >
      <Icon style={{ width: 14, height: 14 }} />
      {label}
    </button>
  )
}

function Section({ title, subtitle, icon: Icon, iconColor = 'var(--brand)', children }: {
  title: string; subtitle?: string; icon: any; iconColor?: string; children: React.ReactNode
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
          <Icon style={{ width: 14, height: 14, color: iconColor }} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

function StepBadge({ n }: { n: number }) {
  return (
    <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, background: 'var(--brand-muted)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
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

  const handleCopyKey = () => {
    if (newKey) { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(API_URL); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleClearContext = async () => {
    try {
      await integrationsApi.clearAll()
      toast.success('Workspace context cleared')
    } catch { toast.error('Failed to clear context') }
    finally { setShowClearContext(false) }
  }

  const handleDeleteAccount = async () => {
    try {
      await authApi.deleteAccount()
      logout()
      router.push('/')
    } catch { toast.error('Failed to delete account') }
    finally { setShowDeleteAccount(false) }
  }

  return (
    <div className="anim-fade-up max-w-[1000px]">

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          Manage your account preferences, developer keys, and VS Code extension integration.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 32, flexDirection: 'column' }} className="lg:flex-row">
        
        {/* Navigation block */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 32, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <TabButton active={tab === 'account'} onClick={() => setTab('account')} icon={User} label="Profile Options" />
            <TabButton active={tab === 'apikeys'} onClick={() => setTab('apikeys')} icon={Key} label="Access Keys" />
            <TabButton active={tab === 'extension'} onClick={() => setTab('extension')} icon={Code2} label="Editor Extension" />
            
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />
            
            <TabButton active={tab === 'danger'} onClick={() => setTab('danger')} icon={AlertTriangle} label="Danger Area" danger />
          </div>
        </div>

        {/* Content block */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* PROFILE */}
          {tab === 'account' && (
            <Section title="User Profile" subtitle="Update your personal details" icon={User} iconColor="var(--success)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                <div className="field-group">
                  <label className="field-label">Full name</label>
                  <input
                    type="text"
                    className="field-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Email address</label>
                  <input
                    type="email"
                    className="field-input"
                    value={user?.email || ''}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>Email cannot be changed directly.</span>
                </div>
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={handleUpdateProfile}
                    disabled={updatingProfile || !name.trim() || name === user?.name}
                    style={{ height: 36 }}
                  >
                    {updatingProfile ? <Loader2 className="anim-spin" style={{ width: 14, height: 14 }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                    Save Changes
                  </button>
                </div>
              </div>
            </Section>
          )}

          {/* API KEYS */}
          {tab === 'apikeys' && (
            <Section title="Developer Access Keys" subtitle="Manage keys used for the VS Code extension or external API access" icon={Key}>
              {loadingStatus ? (
                <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="anim-spin" style={{ color: 'var(--brand)', width: 20, height: 20 }} />
                </div>
              ) : keyStatus?.has_key ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {newKey && (
                    <div style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'var(--success-muted)', border: '1px solid var(--success-border)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <AlertTriangle style={{ width: 16, height: 16, color: 'var(--success-text)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Copy your key now</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        For security reasons, this key will never be shown again.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            type={showKey ? 'text' : 'password'}
                            readOnly
                            value={newKey}
                            style={{ width: '100%', padding: '8px 40px 8px 12px', fontSize: 14, fontFamily: 'monospace', borderRadius: 'var(--r-sm)', background: 'var(--bg-base)', border: '1px solid var(--border-base)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                          <button
                            onClick={() => setShowKey(!showKey)}
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-tertiary)' }}
                          >
                            {showKey ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                          </button>
                        </div>
                        <button className="btn btn-primary" onClick={handleCopyKey}>
                          {copied ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Active Key</h4>
                    <div className="card" style={{ padding: '0 16px', background: 'var(--bg-subtle)' }}>
                      <InfoRow label="Name" value={keyStatus.name || 'VS Code Extension Key'} />
                      <InfoRow label="Prefix" value={`${keyStatus.prefix}...`} mono />
                      <InfoRow label="Created" value={new Date(keyStatus.created_at || '').toLocaleDateString()} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button className="btn" style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }} onClick={() => setShowRevokeKey(true)}>
                      <Trash2 style={{ width: 14, height: 14 }} />Revoke Key
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--r-full)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Key style={{ width: 20, height: 20, color: 'var(--text-tertiary)' }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No active API key</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 300, marginBottom: 24, lineHeight: 1.5 }}>
                    Generate a key to connect the ContextOS VS Code extension to your workspace.
                  </p>
                  <button className="btn btn-primary" onClick={handleGenerateKey} disabled={generating}>
                    {generating ? <Loader2 className="anim-spin" style={{ width: 14, height: 14 }} /> : <Plus style={{ width: 14, height: 14 }} />}
                    Generate New Key
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* VS CODE EXTENSION */}
          {tab === 'extension' && (
            <Section title="VS Code Extension Setup" subtitle="Integrate your IDE with ContextOS" icon={Code2} iconColor="#3b82f6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <StepBadge n={1} />
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Install the Extension</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>Get the ContextOS Copilot extension from the VS Code Marketplace.</p>
                    <a href="https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <button className="btn btn-secondary">
                        <ExternalLink style={{ width: 14, height: 14 }} /> Download from Marketplace
                      </button>
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <StepBadge n={2} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Configure API Settings</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>Open VS Code settings and set the API Base URL to point to this environment.</p>
                    
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>API Base URL</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <input
                        type="text"
                        readOnly
                        value={API_URL}
                        style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'monospace', borderRadius: 'var(--r-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', outline: 'none' }}
                      />
                      <button className="btn btn-secondary" onClick={handleCopyUrl} style={{ padding: '0 12px' }}>
                        {copiedUrl ? <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--success-text)' }} /> : <Copy style={{ width: 14, height: 14 }} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <StepBadge n={3} />
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Set Your API Key</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Generate a key from the <strong>Access Keys</strong> tab and add it to your VS Code settings to authenticate.</p>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* DANGER ZONE */}
          {tab === 'danger' && (
            <Section title="Danger Zone" subtitle="Irreversible destructive actions" icon={Shield} iconColor="#ef4444">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 'var(--r-md)', border: '1px solid var(--danger-border)', background: 'var(--danger-muted)' }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Clear Workspace Context</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Wipes all synchronized chunks across integrations. Re-syncing is required.</p>
                  </div>
                  <button className="btn" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} onClick={() => setShowClearContext(true)}>
                    Clear Context
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 'var(--r-md)', border: '1px solid var(--danger-border)', background: 'var(--danger-muted)' }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Delete Account</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Permanently deletes your account and disassociates all data sources.</p>
                  </div>
                  <button className="btn" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', color: 'var(--danger-text)' }} onClick={() => setShowDeleteAccount(true)}>
                    Delete Account
                  </button>
                </div>

              </div>
            </Section>
          )}

        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showRevokeKey}
        onClose={() => setShowRevokeKey(false)}
        onConfirm={handleRevokeKey}
        title="Revoke API Key"
        message="Running extensions using this key will immediately stop working. This cannot be undone."
        confirmLabel={revoking ? 'Revoking...' : 'Revoke'}
        isDangerous
      />

      <ConfirmModal
        isOpen={showClearContext}
        onClose={() => setShowClearContext(false)}
        onConfirm={handleClearContext}
        title="Clear Workspace Context"
        message="Are you absolutely sure? All synced vector data will be deleted."
        confirmLabel="Clear Context"
        isDangerous
      />

      <ConfirmModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This action is permanent and cannot be undone. All your data will be wiped."
        confirmLabel="Delete Account"
        isDangerous
      />
    </div>
  )
}
