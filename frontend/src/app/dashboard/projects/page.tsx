'use client'

import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Trash2, Loader2, Edit3, X, Search, ChevronRight, MoreHorizontal } from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const PROJECT_COLORS = ['#46e3b7', '#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#f472b6', '#22d3ee', '#c084fc']
const getColor = (name: string) => PROJECT_COLORS[(name?.charCodeAt(0) ?? 0) % PROJECT_COLORS.length]

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ProjectsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [deletingProject, setDeletingProject] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await projectsApi.getAll()
      setProjects(res.data.projects || [])
    } catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }

  const openCreate = () => { setEditingProject(null); setName(''); setDescription(''); setShowModal(true) }
  const openEdit = (p: any) => { setEditingProject(p); setName(p.name); setDescription(p.description || ''); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingProject(null) }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      if (editingProject) {
        const res = await projectsApi.update(editingProject.id, name, description)
        setProjects(prev => prev.map(p => p.id === res.data.id ? res.data : p))
        toast.success('Project updated')
      } else {
        const res = await projectsApi.create(name, description)
        setProjects(prev => [res.data, ...prev])
        toast.success('Project created')
      }
      closeModal()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Action failed')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    try {
      await projectsApi.delete(deletingProject.id)
      setProjects(prev => prev.filter(p => p.id !== deletingProject.id))
      setDeletingProject(null)
      toast.success('Project deleted')
    } catch { toast.error('Failed to delete') }
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="anim-fade-up" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              <span>ContextOS</span>
              <ChevronRight size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>Projects</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Projects
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Organize your context into workspaces · {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} /> New project
          </button>
        </div>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          maxWidth: 320,
          marginBottom: 20,
        }}>
          <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
          <input
            placeholder="Search projects"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 13, flex: 1,
            }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skel" style={{ height: 140, borderRadius: 10 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-base)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <FolderOpen size={18} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {search ? 'No projects match' : 'No projects yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 18 }}>
            {search ? 'Try a different search term.' : 'Create a project to organize your workspace.'}
          </div>
          {!search && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> Create project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map((p) => {
            const color = getColor(p.name)
            return (
              <div key={p.id} className="surface" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 160, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: color,
                    color: '#08201a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700,
                    flexShrink: 0,
                    letterSpacing: '-0.02em',
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(p)} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                      <Edit3 size={12} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                    <button onClick={() => setDeletingProject(p)} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                      <Trash2 size={12} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)',
                    marginBottom: 4, letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.name}
                  </h3>
                  {p.description ? (
                    <p style={{
                      fontSize: 12.5, color: 'var(--text-tertiary)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', lineHeight: 1.5,
                    }}>
                      {p.description}
                    </p>
                  ) : (
                    <p style={{ fontSize: 12.5, color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                      No description
                    </p>
                  )}
                </div>

                <div style={{
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: 11.5, color: 'var(--text-tertiary)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  Created {relTime(p.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeModal}
          />
          <div className="surface anim-fade-up" style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--bg-surface)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {editingProject ? 'Edit project' : 'New project'}
              </h2>
              <button onClick={closeModal} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                <X size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">Project name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                  placeholder="My project"
                  maxLength={50}
                  className="field-input"
                  autoFocus
                />
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right', marginTop: 4 }}>
                  {name.length}/50
                </p>
              </div>
              <div className="field-group">
                <label className="field-label">
                  Description <span style={{ color: 'var(--text-tertiary)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="field-input"
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
            <div style={{
              display: 'flex', gap: 8, padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              justifyContent: 'flex-end',
            }}>
              <button className="btn btn-secondary btn-sm" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={submitting || !name.trim()}
              >
                {submitting ? <Loader2 size={13} className="anim-spin" /> : null}
                {editingProject ? 'Save changes' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDelete}
        title="Delete project"
        message={`Delete "${deletingProject?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDangerous
      />
    </div>
  )
}
