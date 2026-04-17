'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles, Plus, Search, Users, User as UserIcon, Copy, Edit3, Trash2,
  X, Loader2, Tag, Globe, Lock, Send, CheckCircle2,
} from 'lucide-react'
import { promptsApi, type PromptItem, type PromptScope } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

type Filter = 'all' | 'personal' | 'team'

/* ─── Editor modal ─── */
function PromptEditor({
  open, initial, onClose, onSaved, canShareWithTeam,
}: {
  open: boolean
  initial: PromptItem | null
  onClose: () => void
  onSaved: (p: PromptItem, created: boolean) => void
  canShareWithTeam: boolean
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [scope, setScope] = useState<PromptScope>('personal')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setTitle(initial.title)
      setDescription(initial.description || '')
      setBody(initial.body)
      setScope(initial.scope)
      setTags((initial.tags || []).join(', '))
    } else {
      setTitle(''); setDescription(''); setBody(''); setScope('personal'); setTags('')
    }
  }, [open, initial])

  if (!open) return null

  const isEdit = !!initial

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        body,
        description: description.trim() || null,
        scope,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      const res = isEdit
        ? await promptsApi.update(initial!.id, payload)
        : await promptsApi.create(payload)
      onSaved(res.data, !isEdit)
      toast.success(isEdit ? 'Prompt updated' : 'Prompt saved')
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="surface"
        style={{
          width: '100%', maxWidth: 640, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <header style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} style={{ color: '#fbbf24' }} />
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {isEdit ? 'Edit prompt' : 'New prompt'}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </header>

        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Write a PR description"
              className="field-input"
              autoFocus
            />
          </Field>

          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="One-line explanation (optional)"
              className="field-input"
              maxLength={500}
            />
          </Field>

          <Field label="Prompt body" required>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="The actual prompt text. Supports {{variables}} that stay as-is when inserted into chat."
              rows={8}
              className="field-input"
              style={{ resize: 'vertical', minHeight: 120, fontFamily: 'var(--font-mono, monospace)', fontSize: 13, height: 'auto', padding: 12 }}
            />
          </Field>

          <Field label="Tags">
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="comma, separated, tags"
              className="field-input"
            />
          </Field>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Visibility
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ScopeTile
                active={scope === 'personal'}
                onClick={() => setScope('personal')}
                icon={<Lock size={13} />}
                title="Personal"
                desc="Only you can see and use this."
              />
              <ScopeTile
                active={scope === 'team'}
                disabled={!canShareWithTeam}
                onClick={() => canShareWithTeam && setScope('team')}
                icon={<Globe size={13} />}
                title="Team"
                desc={canShareWithTeam ? 'Everyone on your team can use this.' : 'Join or create a team to share.'}
              />
            </div>
          </div>
        </div>

        <footer style={{
          padding: 16, borderTop: '1px solid var(--border-subtle)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} className="btn btn-md btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn btn-md btn-primary" disabled={saving}>
            {saving ? <Loader2 size={13} className="spin" /> : (isEdit ? 'Save changes' : 'Create prompt')}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: any }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
        {label}{required ? <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span> : null}
      </label>
      {children}
    </div>
  )
}

function ScopeTile({
  active, disabled, onClick, icon, title, desc,
}: {
  active: boolean; disabled?: boolean; onClick: () => void
  icon: any; title: string; desc: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 12, borderRadius: 8, textAlign: 'left',
        background: active ? 'rgba(245,158,11,0.08)' : 'var(--bg-raised)',
        border: active ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--border-subtle)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color: active ? '#fbbf24' : 'var(--text-tertiary)' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#fbbf24' : 'var(--text-primary)' }}>{title}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>{desc}</p>
    </button>
  )
}

/* ─── Page ─── */
export default function PromptsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<PromptItem | null>(null)
  const [deleting, setDeleting] = useState<PromptItem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await promptsApi.list()
      setPrompts(res.data.prompts || [])
    } catch (e: any) {
      console.error('Prompts load error:', e)
      // Only show error if it's not a 404 or missing table (which is expected for new deployments)
      const status = e?.response?.status
      const detail = e?.response?.data?.detail || ''
      if (status && status !== 404 && !detail.includes('does not exist')) {
        toast.error(`Failed to load prompts: ${detail || e.message || 'Unknown error'}`)
      }
      // Gracefully set empty array so UI doesn't break
      setPrompts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return prompts.filter(p => {
      if (filter === 'personal' && p.scope !== 'personal') return false
      if (filter === 'team' && p.scope !== 'team') return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    })
  }, [prompts, filter, search])

  const counts = useMemo(() => ({
    all: prompts.length,
    personal: prompts.filter(p => p.scope === 'personal').length,
    team: prompts.filter(p => p.scope === 'team').length,
  }), [prompts])

  const handleSaved = (p: PromptItem, created: boolean) => {
    setPrompts(prev => created
      ? [p, ...prev]
      : prev.map(x => x.id === p.id ? p : x))
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await promptsApi.delete(deleting.id)
      setPrompts(prev => prev.filter(p => p.id !== deleting.id))
      toast.success('Prompt deleted')
    } catch {
      toast.error('Failed to delete prompt')
    } finally {
      setDeleting(null)
    }
  }

  const handleCopy = async (p: PromptItem) => {
    await navigator.clipboard.writeText(p.body)
    setCopiedId(p.id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const handleDuplicate = async (p: PromptItem) => {
    try {
      const res = await promptsApi.duplicate(p.id)
      setPrompts(prev => [res.data, ...prev])
      toast.success('Copied to your personal library')
    } catch {
      toast.error('Failed to duplicate prompt')
    }
  }

  const handleUseInChat = async (p: PromptItem) => {
    try {
      await promptsApi.recordUse(p.id)
    } catch { /* non-fatal */ }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('contextos:seedPrompt', p.body)
      window.location.href = '/dashboard/chat'
    }
  }

  const canShareWithTeam = !!user?.team_id

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* Header */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
            Prompts
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            Reusable prompt templates — saved for you, or shared with your team.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setEditorOpen(true) }}
          className="btn btn-md btn-primary"
          style={{ gap: 6 }}
        >
          <Plus size={14} /> New prompt
        </button>
      </header>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
          {(['all', 'personal', 'team'] as Filter[]).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: filter === k ? 'var(--bg-base)' : 'transparent',
                color: filter === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {k} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[k]}</span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, body, or tag…"
            className="field-input"
            style={{ paddingLeft: 30 }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <Loader2 className="spin" size={20} style={{ marginInline: 'auto' }} />
        </div>
      ) : visible.length === 0 ? (
        <div className="surface" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <Sparkles size={18} style={{ color: '#fbbf24' }} />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {prompts.length === 0 ? 'No prompts yet' : 'Nothing matches that filter'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '6px 0 16px' }}>
            {prompts.length === 0
              ? 'Create your first prompt to reuse it across Chat.'
              : 'Try a different search or switch tabs.'}
          </p>
          {prompts.length === 0 && (
            <button onClick={() => { setEditing(null); setEditorOpen(true) }} className="btn btn-md btn-primary" style={{ gap: 6 }}>
              <Plus size={14} /> New prompt
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {visible.map(p => {
            const isOwner = p.user_id === user?.id
            return (
              <div
                key={p.id}
                className="surface"
                style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.title}
                    </h3>
                    {p.description && (
                      <p style={{
                        fontSize: 12, color: 'var(--text-tertiary)', margin: '3px 0 0',
                        lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    background: p.scope === 'team' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                    color: p.scope === 'team' ? '#60a5fa' : 'var(--text-tertiary)',
                    border: p.scope === 'team'
                      ? '1px solid rgba(59,130,246,0.2)'
                      : '1px solid var(--border-subtle)',
                  }}>
                    {p.scope === 'team' ? <Users size={9} /> : <UserIcon size={9} />}
                    {p.scope}
                  </span>
                </div>

                <pre style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)',
                  borderRadius: 6, padding: 10, fontSize: 11, lineHeight: 1.5,
                  fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary)',
                  margin: 0, whiteSpace: 'pre-wrap', overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                  maxHeight: 88,
                }}>
                  {p.body}
                </pre>

                {p.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.tags.slice(0, 4).map(t => (
                      <span key={t} style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 999,
                        background: 'var(--bg-raised)', color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                        <Tag size={8} /> {t}
                      </span>
                    ))}
                    {p.tags.length > 4 && (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        +{p.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 'auto', paddingTop: 6,
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    Used {p.usage_count}×
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <IconBtn title="Copy to clipboard" onClick={() => handleCopy(p)}>
                      {copiedId === p.id ? <CheckCircle2 size={13} style={{ color: '#4ade80' }} /> : <Copy size={13} />}
                    </IconBtn>
                    <IconBtn title="Use in chat" onClick={() => handleUseInChat(p)}>
                      <Send size={13} style={{ color: '#fbbf24' }} />
                    </IconBtn>
                    {!isOwner && (
                      <IconBtn title="Copy to your library" onClick={() => handleDuplicate(p)}>
                        <Plus size={13} />
                      </IconBtn>
                    )}
                    {isOwner && (
                      <>
                        <IconBtn title="Edit" onClick={() => { setEditing(p); setEditorOpen(true) }}>
                          <Edit3 size={13} />
                        </IconBtn>
                        <IconBtn title="Delete" onClick={() => setDeleting(p)}>
                          <Trash2 size={13} style={{ color: '#ef4444' }} />
                        </IconBtn>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PromptEditor
        open={editorOpen}
        initial={editing}
        onClose={() => { setEditorOpen(false); setEditing(null) }}
        onSaved={handleSaved}
        canShareWithTeam={canShareWithTeam}
      />

      <ConfirmModal
        isOpen={!!deleting}
        title="Delete this prompt?"
        message={deleting ? `"${deleting.title}" will be permanently removed.` : ''}
        confirmLabel="Delete"
        isDangerous
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: any }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--text-tertiary)', transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-raised)'
        e.currentTarget.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-tertiary)'
      }}
    >
      {children}
    </button>
  )
}
