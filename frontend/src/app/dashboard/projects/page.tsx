// frontend/src/app/dashboard/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Trash2, Loader2 } from 'lucide-react'
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


  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
          <p className="text-gray-400 text-sm">Organize your context by project.</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            setName('')
            setDescription('')
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <FolderOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 mb-1">No projects yet</p>
          <p className="text-sm text-gray-500">Create one to organize your context.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between hover:border-gray-700 transition">
              <div className="flex-1">
                <h3 className="font-medium text-white">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-400 mt-0.5">{p.description}</p>}
                <p className="text-xs text-gray-600 mt-1">Created {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(p)}
                  className="text-gray-400 hover:text-white transition p-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingProject(p)}
                  className="text-gray-400 hover:text-red-400 transition p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingProject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowCreateModal(false); setEditingProject(null) }} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">{editingProject ? 'Edit Project' : 'Create Project'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  maxLength={50}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                />
                <p className="text-xs text-gray-600 mt-1">{name.length} / 50</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project description"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowCreateModal(false); setEditingProject(null) }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingProject ? handleUpdate : handleCreate}
                  disabled={submitting || !name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
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
