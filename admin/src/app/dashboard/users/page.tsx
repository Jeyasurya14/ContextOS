'use client'

import { useEffect, useState } from 'react'
import { Search, Edit, Trash2, Eye, UserPlus, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '@/lib/api'

interface User {
  id: string
  email: string
  full_name: string
  plan: string
  is_active: boolean
  is_admin: boolean
  is_verified: boolean
  team_id: string | null
  query_count_today: number
  created_at: string
  updated_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [page, search, planFilter, activeFilter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit,
        offset: page * limit,
      }
      if (search) params.search = search
      if (planFilter) params.plan = planFilter
      if (activeFilter !== undefined) params.is_active = activeFilter

      const { data } = await adminApi.getUsers(params)
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDelete = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedUser) return
    
    try {
      await adminApi.deleteUser(selectedUser.id)
      setShowDeleteModal(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete user')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-dark-400">Manage all ContextOS users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                placeholder="Search by email or name..."
                className="input pl-10"
              />
            </div>
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value)
                setPage(0)
              }}
              className="input"
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
          </div>

          {/* Active Filter */}
          <div>
            <select
              value={activeFilter === undefined ? '' : activeFilter.toString()}
              onChange={(e) => {
                const value = e.target.value
                setActiveFilter(value === '' ? undefined : value === 'true')
                setPage(0)
              }}
              className="input"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800">
                <th className="text-left p-4 text-sm font-medium text-dark-400">User</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Plan</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Queries Today</th>
                <th className="text-left p-4 text-sm font-medium text-dark-400">Created</th>
                <th className="text-right p-4 text-sm font-medium text-dark-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-dark-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-dark-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {user.full_name}
                          {user.is_admin && (
                            <span className="badge badge-warning text-xs">Admin</span>
                          )}
                        </div>
                        <div className="text-sm text-dark-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        user.plan === 'free' ? 'badge-neutral' :
                        user.plan === 'pro' ? 'badge-warning' :
                        'badge-success'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-white">
                      {user.query_count_today}
                    </td>
                    <td className="p-4 text-dark-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-dark-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-dark-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-800">
            <div className="text-sm text-dark-400">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="btn btn-secondary disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-dark-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSave={() => {
            setShowEditModal(false)
            setSelectedUser(null)
            loadUsers()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Delete User</h2>
            <p className="text-dark-300 mb-6">
              Are you sure you want to delete <strong>{selectedUser.full_name}</strong>? This action cannot be undone and will delete all user data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedUser(null)
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    plan: user.plan,
    is_active: user.is_active,
    is_admin: user.is_admin,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await adminApi.updateUser(user.id, formData)
      onSave()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full">
        <h2 className="text-xl font-bold text-white mb-6">Edit User</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              className="input bg-dark-800 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-dark-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Plan
            </label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="input"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-dark-700 bg-dark-900 text-brand focus:ring-brand"
              />
              <span className="text-sm text-dark-300">Active</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                className="w-4 h-4 rounded border-dark-700 bg-dark-900 text-brand focus:ring-brand"
              />
              <span className="text-sm text-dark-300">Admin</span>
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
