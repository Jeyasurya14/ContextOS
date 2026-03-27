// frontend/src/app/dashboard/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Trash2, Loader2, Edit3, Calendar, X, Search, ChevronRight } from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const PROJECT_COLORS = [
  { bg: '#d97706', glow: 'rgba(217,119,6,0.15)' },
  { bg: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
  { bg: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
  { bg: '#22c55e', glow: 'rgba(34,197,94,0.15)' },
  { bg: '#e01e5a', glow: 'rgba(224,30,90,0.15)' },
  { bg: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  { bg: '#06b6d4', glow: 'rgba(6,182,212,0.15)' },
  { bg: '#a855f7', glow: 'rgba(168,85,247,0.15)' },
]

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
      <style>{`
        @keyframes pjFade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes pjCard { from { opacity:0; transform:translateY(8px) scale(0.99); } to { opacity:1; transform:none; } }
      `}</style>

      <div className="max-w-5xl" style={{ animation: 'pjFade 0.3s ease-out' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}>
                <FolderOpen className="w-3.5 h-3.5 text-brand" />
                <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">Projects</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
            <p className="text-dark-500 text-sm mt-1">
              Organize your context by workspace · <span className="text-white font-medium">{projects.length}</span> total
            </p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.25)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(217,119,6,0.25)')}>
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {/* Search */}
        {projects.length > 3 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-dark-900/60 border border-white/6 text-white placeholder-dark-600 outline-none focus:border-brand/30 transition-colors" />
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ height: '160px', background: 'rgba(24,24,27,0.4)', border: '1px solid rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.12)' }}>
              <FolderOpen className="w-8 h-8 text-brand opacity-40" />
            </div>
            <h3 className="text-white font-semibold mb-1">{search ? 'No results found' : 'No projects yet'}</h3>
            <p className="text-sm text-dark-600 mb-5 max-w-xs">
              {search ? 'Try a different search term.' : 'Create a project to organize your AI context into workspaces.'}
            </p>
            {!search && (
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', color: '#f59e0b' }}>
                <Plus className="w-4 h-4" /> Create first project
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, idx) => {
              const color = getColor(p.name)
              return (
                <div key={p.id} className="group relative rounded-2xl overflow-hidden cursor-default transition-all duration-200"
                  style={{
                    background: 'rgba(15,15,17,0.85)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    animation: `pjCard 0.35s ease-out ${idx * 0.05}s both`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${color.bg}30`
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.2), 0 0 20px ${color.glow}`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                  }}>
                  {/* Top color stripe */}
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${color.bg}, transparent)` }} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ background: color.bg, boxShadow: `0 4px 12px ${color.glow}` }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => openEdit(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#71717a' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeletingProject(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#71717a' }}
                          onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(220,38,38,0.1)'); (e.currentTarget.style.color = '#f87171') }}
                          onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.04)'); (e.currentTarget.style.color = '#71717a') }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-white text-[14px] mb-1 truncate">{p.name}</h3>
                    {p.description && (
                      <p className="text-[12px] text-dark-600 line-clamp-2 leading-relaxed mb-3">{p.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-dark-700 mt-3 pt-3 border-t border-white/4">
                      <Calendar className="w-3 h-3" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ animation: 'pjFade 0.2s ease-out' }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(15,15,17,0.97)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}>
              <div className="h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-base font-bold text-white">{editingProject ? 'Edit Project' : 'New Project'}</h2>
                <button onClick={closeModal} className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-600 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 pb-4 space-y-4">
                <div>
                  <label className="block text-xs text-dark-500 font-medium mb-1.5 uppercase tracking-wider">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="My awesome project"
                    maxLength={50}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-900/70 border border-white/7 text-white placeholder-dark-700 outline-none transition-colors"
                    style={{ border: name ? '1px solid rgba(217,119,6,0.3)' : '1px solid rgba(255,255,255,0.07)' }}
                    autoFocus />
                  <p className="text-[10px] text-dark-700 mt-1 text-right">{name.length}/50</p>
                </div>
                <div>
                  <label className="block text-xs text-dark-500 font-medium mb-1.5 uppercase tracking-wider">Description <span className="text-dark-700 normal-case">(optional)</span></label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What is this project about?"
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-dark-900/70 border border-white/7 text-white placeholder-dark-700 outline-none resize-none transition-colors focus:border-brand/25" />
                </div>
              </div>
              <div className="flex gap-2.5 px-6 py-4 border-t border-white/5">
                <button onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-dark-500 hover:text-dark-300 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal isOpen={!!deletingProject} onClose={() => setDeletingProject(null)}
          onConfirm={handleDelete}
          title="Delete Project"
          message={`Delete "${deletingProject?.name}"? This cannot be undone.`}
          confirmLabel="Delete" isDangerous />
      </div>
    </>
  )
}
