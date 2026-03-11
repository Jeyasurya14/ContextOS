// frontend/src/app/dashboard/projects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import { projectsApi } from '@/lib/api';
import type { Project } from '@/lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list();
      setProjects(res.data);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await projectsApi.create({ name, description: description || undefined });
      setName('');
      setDescription('');
      setShowCreate(false);
      await loadProjects();
    } catch {
      // handle silently
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectsApi.delete(id);
      await loadProjects();
    } catch {
      // handle silently
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-50 mb-1">Projects</h1>
          <p className="text-dark-400 text-sm">Organize your context by project.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-dark transition"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-dark-900 border border-dark-700 rounded-xl p-5 mb-6 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            required
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:border-brand transition"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:border-brand transition"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-dark transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="bg-dark-800 text-dark-300 px-4 py-2 rounded-lg text-sm hover:bg-dark-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
          <FolderOpen className="w-10 h-10 text-dark-500 mx-auto mb-3" />
          <p className="text-dark-300 mb-1">No projects yet</p>
          <p className="text-sm text-dark-500">Create one to organize your context.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="bg-dark-900 border border-dark-700 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-dark-50">{p.name}</h3>
                {p.description && <p className="text-sm text-dark-400 mt-0.5">{p.description}</p>}
                <p className="text-xs text-dark-500 mt-1">Created {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-dark-500 hover:text-danger transition p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
