// frontend/src/app/dashboard/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Trash2, Loader2, Sparkles, Edit3, Calendar, ChevronRight, X } from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ProjectCardSkeleton } from '@/components/ui/Skeleton'

export default function ProjectsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [deletingProject, setDeletingProject] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await projectsApi.getAll()
      setProjects(res.data.projects || [])
    } catch (err: any) {
      toast.error('Failed to load projects')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const res = await projectsApi.create(name, description)
      setProjects((prev) => [res.data, ...prev])
      setShowCreateModal(false)
      setName('')
      setDescription('')
      toast.success('Project created!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingProject || !name.trim()) return
    setSubmitting(true)
    try {
      const res = await projectsApi.update(editingProject.id, name, description)
      setProjects((prev) => prev.map((p) => (p.id === res.data.id ? res.data : p)))
      setEditingProject(null)
      setName('')
      setDescription('')
      toast.success('Project updated!')
    } catch (err: any) {
      toast.error('Failed to update project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    setSubmitting(true)
    try {
      await projectsApi.delete(deletingProject.id)
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id))
      setDeletingProject(null)
      toast.success('Project deleted')
    } catch (err: any) {
      toast.error('Failed to delete project')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (project: any) => {
    setEditingProject(project)
    setName(project.name)
    setDescription(project.description || '')
  }

  const getProjectColor = (name: string): string => {
    const colors = [
      'from-brand/20 to-brand-dark/10',
      'from-purple-500/20 to-purple-900/10',
      'from-sky-500/20 to-sky-900/10',
      'from-green-500/20 to-green-900/10',
      'from-pink-500/20 to-pink-900/10',
      'from-orange-500/20 to-orange-900/10',
    ]
    const idx = name?.charCodeAt(0) % colors.length || 0
    return colors[idx]
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Projects</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Projects</h1>
          <p className="text-dark-400 text-[15px]">Organize your context by project</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            setName('')
            setDescription('')
          }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="glass-card text-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand/10 to-brand-dark/5 border border-brand/15 flex items-center justify-center mx-auto mb-5 animate-float">
            <FolderOpen className="w-10 h-10 text-brand/60" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-sm text-dark-400 mb-6 max-w-xs mx-auto">Create a project to organize your context into manageable workspaces</p>
          <button
            onClick={() => {
              setShowCreateModal(true)
              setName('')
              setDescription('')
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Create your first project
          </button>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p, idx) => (
            <div
              key={p.id}
              className="glass-card group relative overflow-hidden hover:border-dark-700/60 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Gradient accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getProjectColor(p.name)} opacity-20 pointer-events-none`} />

              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getProjectColor(p.name)} border border-dark-700/30 flex items-center justify-center`}>
                      <FolderOpen className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-brand transition-colors duration-200">{p.name}</h3>
                      {p.description && <p className="text-sm text-dark-400 mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/60 transition-all duration-200"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingProject(p)}
                      className="p-2 rounded-lg text-dark-400 hover:text-danger hover:bg-danger/10 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-dark-500 mt-3 pt-3 border-t border-dark-800/30">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Created {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingProject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowCreateModal(false); setEditingProject(null) }}
          />
          <div className="relative glass-card max-w-md w-full mx-4 !p-0 overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800/40">
              <h2 className="text-lg font-bold text-white">
                {editingProject ? 'Edit Project' : 'Create Project'}
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); setEditingProject(null) }}
                className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800/60 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-dark-400 mb-2 font-medium">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  maxLength={50}
                  className="input-premium"
                />
                <p className="text-[11px] text-dark-500 mt-1.5">{name.length} / 50</p>
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-2 font-medium">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project description"
                  rows={3}
                  className="input-premium resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-dark-800/40 bg-dark-900/30">
              <button
                onClick={() => { setShowCreateModal(false); setEditingProject(null) }}
                disabled={submitting}
                className="btn btn-secondary disabled:opacity-50 flex-1"
              >
                Cancel
              </button>
              <button
                onClick={editingProject ? handleUpdate : handleCreate}
                disabled={submitting || !name.trim()}
                className="btn btn-primary disabled:opacity-50 flex-1"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingProject ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDangerous
      />
    </div>
  )
}
