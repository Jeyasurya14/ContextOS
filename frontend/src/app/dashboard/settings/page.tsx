'use client'

import { useEffect, useState } from 'react'
import {
  Key, Copy, AlertTriangle, Loader2, Trash2, User, ExternalLink,
  Code2, Plus, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

/* ─── Section wrapper ─── */
function Section({ title, desc, children }: any) {
  return (
    <section className="surface" style={{ marginBottom: 20 }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>{title}</h2>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</p>
      </header>
      <div style={{ padding: 20 }}>{children}</div>
    </section>
  )
}

/* ─── Page ─── */
export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [updating, setUpdating] = useState(false)
  const [keyStatus, setKeyStatus] = useState<any>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showRevoke, setShowRevoke] = useState(false)
  const [showWipe, setShowWipe] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [generating, setGenerating] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://contextos-api-jxdr.onrender.com'

  useEffect(() => {
    authApi.getApiKeyStatus().then(r => setKeyStatus(r.data)).catch(() => {})
  }, [])

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const res = await authApi.updateProfile(name)
      setUser(res.data)
      toast.success('Profile updated')
    } catch { toast.error('Update failed') }
    finally { setUpdating(false) }
  }

  const handleGenerateKey = async () => {
    setGenerating(true)
    try {
      const res = await authApi.generateApiKey('Default Key')
      setNewKey(res.data.api_key)
      toast.success('API key generated')
      const s = await authApi.getApiKeyStatus()
      setKeyStatus(s.data)
    } catch { toast.error('Failed to generate key') }
    finally { setGenerating(false) }
  }

  const handleWipe = async () => {
    setWiping(true)
    try {
      await integrationsApi.clearAll()
      toast.success('All indexed data cleared')
    } catch {
      toast.error('Clear operation failed')
    } finally {
      setWiping(false)
      setShowWipe(false)
    }
  }

  return (
    <div className="anim-fade-up" style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
          <span>ContextOS</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-secondary)' }}>Settings</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Settings
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
          Manage your profile, API access and workspace data.
        </p>
      </div>

      {/* Profile */}
      <Section title="Profile" desc="Your account name and email">
        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field-group">
            <label className="field-label">Display name</label>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.5, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
            />
          </div>
          <div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleUpdate}
              disabled={updating || !name.trim() || name === user?.name}
            >
              {updating ? <Loader2 size={13} className="anim-spin" /> : null}
              Save changes
            </button>
          </div>
        </div>
      </Section>

      {/* API Keys */}
      <Section title="API keys" desc="Authenticate the VS Code extension and external integrations">
        {newKey && (
          <div style={{
            padding: 16,
            background: 'var(--brand-muted)',
            border: '1px solid var(--brand-border)',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--brand-text)', marginBottom: 6 }}>
              New API key generated
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Copy this key now — it won't be shown again.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                readOnly
                value={newKey}
                style={{
                  flex: 1,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontSize: 12.5,
                  fontFamily: 'JetBrains Mono, monospace',
                  borderRadius: 6,
                  outline: 'none',
                }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied') }}
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>
        )}

        {keyStatus?.has_key ? (
          <div>
            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>Name</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{keyStatus.name}</span>
              </div>
              <div style={{
                padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>Prefix</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {keyStatus.prefix}…
                </span>
              </div>
              <div style={{
                padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>Created</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {new Date(keyStatus.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowRevoke(true)}
                style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
              >
                <Trash2 size={13} /> Revoke key
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-base)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Key size={16} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
              No API key yet
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              Generate a key to use the VS Code extension or external clients.
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleGenerateKey} disabled={generating}>
              {generating ? <Loader2 size={13} className="anim-spin" /> : <Plus size={13} />}
              Generate API key
            </button>
          </div>
        )}
      </Section>

      {/* VS Code Extension */}
      <Section title="VS Code extension" desc="Configure the ContextOS Copilot extension">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              API endpoint
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                readOnly
                value={API_URL}
                style={{
                  flex: 1,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-base)',
                  color: 'var(--text-secondary)',
                  padding: '8px 12px',
                  fontSize: 12.5,
                  fontFamily: 'JetBrains Mono, monospace',
                  borderRadius: 6,
                  outline: 'none',
                }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { navigator.clipboard.writeText(API_URL); toast.success('Copied') }}
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <a
            href="https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              <ExternalLink size={13} /> Open marketplace
            </button>
          </a>
        </div>
      </Section>

      {/* Danger zone */}
      <section className="surface" style={{ borderColor: 'var(--danger-border)' }}>
        <header style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--danger-border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={14} style={{ color: 'var(--danger-text)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger-text)', letterSpacing: '-0.005em' }}>
            Danger zone
          </h2>
        </header>
        <div style={{
          padding: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
              Clear all indexed data
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              Permanently deletes context from all sources. This cannot be undone.
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            disabled={wiping}
            style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
            onClick={() => setShowWipe(true)}
          >
            {wiping ? <Loader2 size={13} className="anim-spin" /> : <Trash2 size={13} />}
            Clear data
          </button>
        </div>
      </section>

      <ConfirmModal
        isOpen={showRevoke}
        onClose={() => setShowRevoke(false)}
        onConfirm={async () => {
          await authApi.revokeApiKey()
          toast.success('API key revoked')
          setKeyStatus({ has_key: false })
          setShowRevoke(false)
        }}
        title="Revoke API key"
        message="This will immediately invalidate the key. Any extension or client using it will need a new key."
        confirmLabel="Revoke"
        isDangerous
      />

      <ConfirmModal
        isOpen={showWipe}
        onClose={() => setShowWipe(false)}
        onConfirm={handleWipe}
        title="Clear all data"
        message="This will permanently delete all indexed context from your workspace. This cannot be undone."
        confirmLabel="Clear everything"
        isDangerous
      />
    </div>
  )
}
