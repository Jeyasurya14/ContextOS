'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Key, Copy, AlertTriangle, Loader2, Trash2, CheckCircle2, User, Eye, EyeOff,
  Shield, Terminal, Plug, RefreshCw, ExternalLink, Code2, Zap, RotateCcw, Plus,
  Settings, Database, Command, Cpu
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

/* ─── Industrial Components ─── */
function SettingsSection({ title, desc, icon: Icon, children }: any) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
       <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-base)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--bg-base)', border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Icon size={14} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
             <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h3>
             <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{desc}</p>
          </div>
       </div>
       <div style={{ padding: 24 }}>{children}</div>
    </div>
  )
}

function ConfigRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit' }}>{value}</span>
    </div>
  )
}

/* ─── Main Page ────────────────*─── */
export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  const [name, setName] = useState(user?.name || '')
  const [updating, setUpdating] = useState(false)
  const [keyStatus, setKeyStatus] = useState<any>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showRevoke, setShowRevoke] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://contextos-api-jxdr.onrender.com'

  useEffect(() => {
    authApi.getApiKeyStatus().then(r => setKeyStatus(r.data)).catch(() => {})
  }, [])

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const res = await authApi.updateProfile(name)
      setUser(res.data)
      toast.success('Identity updated')
    } catch { toast.error('Update failed') }
    finally { setUpdating(false) }
  }

  const handleGenerateKey = async () => {
    try {
      const res = await authApi.generateApiKey('Industrial Key')
      setNewKey(res.data.api_key)
      toast.success('Key Protocol Established')
      const s = await authApi.getApiKeyStatus(); setKeyStatus(s.data)
    } catch { toast.error('Key Generation Failure') }
  }

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Identity ── */}
      <SettingsSection title="Identity Management" desc="Configure your workspace operator profile." icon={User}>
         <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="field-group">
               <label className="field-label">Operator Name</label>
               <input className="field-input" value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div className="field-group">
               <label className="field-label">Signal Address</label>
               <input className="field-input" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
            </div>
            <button className="btn btn-primary" onClick={handleUpdate} disabled={updating} style={{ width: 'fit-content' }}>
               {updating ? 'Updating Registry...' : 'Update identity'}
            </button>
         </div>
      </SettingsSection>

      {/* ── Key Management ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 24 }}>
         
         <SettingsSection title="Access Protocols" desc="Environment keys for IDE & API authorization." icon={Key}>
            {newKey && (
               <div style={{ padding: 16, background: 'var(--brand-muted)', border: '1px solid var(--brand-border)', borderRadius: 'var(--r-md)', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-text)', marginBottom: 8, textTransform: 'uppercase' }}>New Key Generated (One-time Display)</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                     <input readOnly value={newKey} style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-base)', color: 'var(--text-primary)', padding: '6px 12px', fontSize: 13, fontFamily: 'monospace', borderRadius: 'var(--r-sm)' }} />
                     <button className="btn btn-secondary" onClick={()=>{navigator.clipboard.writeText(newKey); toast.success('Key Copied')}}><Copy size={14} /></button>
                  </div>
               </div>
            )}

            {keyStatus?.has_key ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', padding: '0 16px' }}>
                    <ConfigRow label="Key Cluster" value={keyStatus.name} />
                    <ConfigRow label="Prefix" value={`${keyStatus.prefix}...`} mono />
                    <ConfigRow label="Initialized" value={new Date(keyStatus.created_at).toLocaleDateString()} />
                  </div>
                  <button className="btn btn-ghost" style={{ width: 'fit-content', color: 'var(--danger-text)' }} onClick={()=>setShowRevoke(true)}>
                    <Trash2 size={14} /> Revoke Authorization
                  </button>
               </div>
            ) : (
               <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>No active developer keys found for this operator.</p>
                  <button className="btn btn-primary" onClick={handleGenerateKey}>
                     <Plus size={14} /> Initialize Access Key
                  </button>
               </div>
            )}
         </SettingsSection>

         <SettingsSection title="IDE Integration" desc="Configuration for the VS Code Copilot." icon={Code2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Service Endpoint</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                     <input readOnly value={API_URL} style={{ flex: 1, background: 'var(--bg-subtle)', border: 'none', color: 'var(--text-secondary)', padding: '6px 10px', fontSize: 11, fontFamily: 'monospace', borderRadius: '4px' }} />
                     <button onClick={()=>{navigator.clipboard.writeText(API_URL); toast.success('URL Copied')}} style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Copy size={12} /></button>
                  </div>
               </div>
               <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  Ensure your extension is running v3.0.4+ to support semantic context streaming.
               </div>
               <a href="https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot" target="_blank" className="btn btn-secondary" style={{ width: '100%' }}>
                  <ExternalLink size={14} /> View Marketplace
               </a>
            </div>
         </SettingsSection>
      </div>

      {/* ── Dangerous ── */}
      <div className="card" style={{ border: '1px solid var(--danger-border)', background: 'rgba(239, 68, 68, 0.02)' }}>
         <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={14} style={{ color: 'var(--danger-text)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger-text)', textTransform: 'uppercase' }}>Dangerous Terminal</h3>
         </div>
         <div style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
               <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Full Registry Wipe</div>
               <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>This will erase all indexed vectors. This cannot be undone.</div>
            </div>
            <button className="btn" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-base)', color: 'var(--danger-text)' }}>
               Execute Wipe
            </button>
         </div>
      </div>

      <ConfirmModal 
        isOpen={showRevoke} 
        onClose={()=>setShowRevoke(false)} 
        onConfirm={async ()=>{ await authApi.revokeApiKey(); toast.success('Key Revoked'); setShowRevoke(false); }}
        title="Revoke Protocol"
        message="This will immediately kill all active extension sessions. Continue?"
        isDangerous
      />

    </div>
  )
}
