// frontend/src/app/dashboard/team/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Mail, Loader2, Trash2, Copy, Sparkles, Crown, Shield, CheckCircle2 } from 'lucide-react'
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-brand" />
      case 'admin': return <Shield className="w-3 h-3 text-warning" />
      default: return <Users className="w-3 h-3 text-dark-400" />
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-brand/10 text-brand border-brand/20'
      case 'admin': return 'bg-warning/10 text-warning border-warning/20'
      default: return 'bg-dark-800/60 text-dark-400 border-dark-700/40'
    }
  }

  const getAvatarColor = (name: string): string => {
    const colors = [
      'from-brand/30 to-brand-dark/20',
      'from-success/30 to-success/10',
      'from-warning/30 to-warning/10',
      'from-purple-500/30 to-purple-900/10',
      'from-sky-500/30 to-sky-900/10',
      'from-pink-500/30 to-pink-900/10',
    ]
    const idx = name?.charCodeAt(0) % colors.length || 0
    return colors[idx]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-dark-500 text-sm">Loading team...</p>
        </div>
      </div>
    )
  }

  // No team yet — Create team state
  if (!team) {
    return (
      <div className="max-w-3xl animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Team</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Team</h1>
          <p className="text-dark-400 text-[15px]">Create a team to share context with collaborators</p>
        </div>

        <div className="glass-card max-w-lg animate-slide-up text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5">
            <Users className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Create a Team</h2>
          <p className="text-sm text-dark-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Teams let you share context across members. Everyone gets smarter answers based on shared knowledge.
          </p>
          <div className="space-y-3 max-w-sm mx-auto">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="input-premium text-center"
            />
            <button
              onClick={handleCreateTeam}
              disabled={submitting || !teamName.trim()}
              className="btn btn-primary disabled:opacity-50 w-full justify-center"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Team exists — Full team management
  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Team</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Team</h1>
        <p className="text-dark-400 text-[15px]">Manage your team members and invitations</p>
      </div>

      {/* Team Info Card */}
      <div className="glass-card mb-6 animate-slide-up">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/20 to-brand-dark/10 border border-brand/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">{team.name}</h2>
            <p className="text-sm text-dark-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Invite Section */}
        <div className="pt-4 border-t border-dark-800/40">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand" /> Invite Member
          </h3>
          <div className="flex gap-3">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              className="input-premium flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="input-premium !w-auto"
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
            <div className="mt-4 animate-slide-up rounded-xl border border-success/20 overflow-hidden">
              <div className="bg-success/5 px-4 py-2.5 border-b border-success/10 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <p className="text-xs text-success font-medium">Invitation link created</p>
              </div>
              <div className="p-3 flex gap-2 bg-dark-900/30">
                <input
                  value={inviteLink}
                  readOnly
                  className="input-premium flex-1 !text-xs font-mono"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="btn btn-secondary text-brand text-sm !px-3"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="glass-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-dark-400" />
          Members ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((member, idx) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-dark-800/20 border border-dark-800/30 hover:border-dark-700/40 transition-all duration-200 group animate-slide-up"
              style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(member.full_name || '')} flex items-center justify-center text-white font-semibold text-sm`}>
                  {(member.full_name || '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{member.full_name}</p>
                  <p className="text-[11px] text-dark-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] px-2.5 py-1 rounded-full capitalize font-medium flex items-center gap-1.5 border ${getRoleBadgeClass(member.team_role)}`}>
                  {getRoleIcon(member.team_role)}
                  {member.team_role}
                </span>
                {member.id !== user?.id && (
                  <button
                    onClick={() => setRemovingMember(member)}
                    className="text-dark-600 hover:text-danger transition-all duration-200 p-1.5 rounded-lg hover:bg-danger/10 opacity-0 group-hover:opacity-100"
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
