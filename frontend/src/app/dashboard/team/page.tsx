// frontend/src/app/dashboard/team/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Mail, Loader2, Trash2, Copy } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { teamsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export default function TeamPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [removingMember, setRemovingMember] = useState<any>(null)

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    setLoading(true)
    try {
      const res = await teamsApi.getMyTeam()
      setTeam(res.data)
      if (res.data?.id) {
        const membersRes = await teamsApi.getMembers()
        setMembers(membersRes.data || [])
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        toast.error('Failed to load team')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return
    setSubmitting(true)
    try {
      const res = await teamsApi.create(teamName)
      setTeam(res.data)
      setMembers(user ? [{ ...user, full_name: user.name, team_role: 'owner' }] : [])
      toast.success('Team created!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create team')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail || !team) return
    setInviting(true)
    try {
      const res = await teamsApi.invite(team.id, inviteEmail, inviteRole)
      setInviteLink(res.data.invite_url)
      setInviteEmail('')
      toast.success('Invitation created!')
    } catch (err: any) {
      const msg = err?.response?.data?.detail
      if (msg?.includes('already a member')) {
        toast.error('This person is already in your team.')
      } else {
        toast.error(msg || 'Failed to send invite')
      }
    } finally {
      setInviting(false)
    }
  }

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast.success('Link copied!')
  }

  const handleRemoveMember = async () => {
    if (!removingMember || !team) return
    try {
      await teamsApi.removeMember(team.id, removingMember.id)
      setMembers((prev) => prev.filter((m) => m.id !== removingMember.id))
      setRemovingMember(null)
      toast.success('Member removed')
    } catch (err: any) {
      toast.error('Failed to remove member')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-dark-500" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold text-white mb-2">Team</h1>
        <p className="text-dark-400 text-sm mb-8">Create a team to share context with collaborators</p>

        <div className="card max-w-lg animate-slide-up">
          <Users className="w-10 h-10 text-dark-500 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Create a Team</h2>
          <p className="text-sm text-dark-400 mb-6">
            Teams let you share context across members. Everyone gets smarter answers based on shared knowledge.
          </p>
          <div className="space-y-3">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand/50 transition"
            />
            <button
              onClick={handleCreateTeam}
              disabled={submitting || !teamName.trim()}
              className="btn btn-primary disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-white mb-2">Team</h1>
      <p className="text-dark-400 text-sm mb-8">Manage your team members and invitations</p>

      <div className="card mb-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="font-semibold text-white">{team.name}</h2>
            <p className="text-sm text-dark-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Invite Member</h3>
          <div className="flex gap-3">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand/50 transition"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand/50 transition"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="btn btn-primary disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Invite
            </button>
          </div>
          {inviteLink && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <p className="text-xs text-warning mb-2">Invitation link created:</p>
              <div className="flex gap-2">
                <input
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-dark-800 border border-dark-700 rounded px-2 py-1 text-xs text-dark-200 font-mono"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="text-brand hover:text-brand/80 transition p-1"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-medium text-white mb-4">Members</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-white">{member.full_name}</p>
                <p className="text-xs text-dark-400">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 bg-dark-700 text-dark-300 rounded-full capitalize">{member.team_role}</span>
                {member.id !== user?.id && (
                  <button
                    onClick={() => setRemovingMember(member)}
                    className="text-dark-400 hover:text-danger transition p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!removingMember}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${removingMember?.full_name} from the team?`}
        confirmLabel="Remove"
        isDangerous
      />
    </div>
  )
}
