'use client'

import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Trash2, Loader2, Edit3, Calendar, X, Search } from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const PROJECT_COLORS = ['#d97706', '#8b5cf6', '#3b82f6', '#22c55e', '#e01e5a', '#f59e0b', '#06b6d4', '#a855f7']

function getColor(name: string) {
  return PROJECT_COLORS[(name?.charCodeAt(0) ?? 0) % PROJECT_COLORS.length]
}

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
        toast.success('Project updated!')
      } else {
        const res = await projectsApi.create(name, description)
        setProjects(prev => [res.data, ...prev])
        toast.success('Project created!')
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
    } catch { toast.error('Failed to delete project') }
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="anim-fade-up max-w-[1000px]">
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>Projects</h1>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
              Organize your context by workspace · <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{projects.length}</span> total
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus style={{ width: 14, height: 14 }} /> New Project
          </button>
        </div>

        {/* Search */}
        {projects.length > 3 && (
          <div style={{ position: 'relative', marginBottom: 24, maxWidth: 320 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-tertiary)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="field-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card skel" style={{ height: '160px' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <FolderOpen style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{search ? 'No results found' : 'No projects yet'}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 300, marginBottom: 24 }}>
              {search ? 'Try a different search term.' : 'Create a project to organize your AI context into workspaces.'}
            </p>
            {!search && (
              <button className="btn btn-secondary" onClick={openCreate}>
                <Plus style={{ width: 14, height: 14 }} /> Create first project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map((p) => {
              const color = getColor(p.name)
              return (
                <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                  {/* Top color stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />

                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0, background: color }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openEdit(p)} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                          <Edit3 style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
                        </button>
                        <button onClick={() => setDeletingProject(p)} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                          <Trash2 style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
                    {p.description ? (
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, minHeight: 36 }}>{p.description}</p>
                    ) : (
                      <div style={{ minHeight: 36 }} />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                      <Calendar style={{ width: 12, height: 12 }} />
                      <span>{relTime(p.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(4px)' }} onClick={closeModal} />
            <div className="card anim-fade-up" style={{ position: 'relative', width: '100%', maxWidth: 440, margin: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{editingProject ? 'Edit Project' : 'New Project'}</h2>
                <button onClick={closeModal} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                  <X style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
                </button>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field-group">
                  <label className="field-label">Project Name</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="My awesome project" maxLength={50}
                    className="field-input" autoFocus
                  />
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'right', marginTop: 4 }}>{name.length}/50</p>
                </div>
                <div className="field-group">
                  <label className="field-label">Description <span style={{ color: 'var(--text-tertiary)', textTransform: 'none' }}>(optional)</span></label>
                  <textarea
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What is this project about?" rows={3}
                    className="field-input" style={{ resize: 'none' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                <button className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !name.trim()} style={{ flex: 1 }}>
                  {submitting ? <Loader2 className="anim-spin" style={{ width: 14, height: 14 }} /> : editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingProject} onClose={() => setDeletingProject(null)}
          onConfirm={handleDelete} title="Delete Project"
          message={`Delete "${deletingProject?.name}"? This cannot be undone.`}
          confirmLabel="Delete" isDangerous
        />
      </div>
    </>
  )
}
