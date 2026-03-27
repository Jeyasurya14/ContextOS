// frontend/src/app/dashboard/team/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Mail, Loader2, Trash2, Copy, Crown, Shield, CheckCircle2, X, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { teamsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const AVATAR_COLORS = ['#d97706','#8b5cf6','#3b82f6','#22c55e','#e01e5a','#f59e0b','#06b6d4','#a855f7']
const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

function RoleBadge({ role }: { role: string }) {
  const cfg = role === 'owner'
    ? { icon: Crown, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' }
    : role === 'admin'
    ? { icon: Shield, color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.2)' }
    : { icon: Users, color: '#71717a', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.15)' }
  const Icon = cfg.icon
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon className="w-2.5 h-2.5" /> {role}
    </span>
  )
}

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

  useEffect(() => { loadTeam() }, [])

  const loadTeam = async () => {
    setLoading(true)
    try {
      const res = await teamsApi.getMyTeam()
      setTeam(res.data)
      if (res.data?.id) {
        const mres = await teamsApi.getMembers()
        setMembers(mres.data || [])
      }
    } catch (e: any) {
      if (e?.response?.status !== 404) toast.error('Failed to load team')
    } finally { setLoading(false) }
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return
    setSubmitting(true)
    try {
      const res = await teamsApi.create(teamName)
      setTeam(res.data)
      setMembers(user ? [{ ...user, full_name: user.name, team_role: 'owner' }] : [])
      toast.success('Team created!')
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to create team') }
    finally { setSubmitting(false) }
  }

  const handleInvite = async () => {
    if (!inviteEmail || !team) return
    setInviting(true)
    try {
      const res = await teamsApi.invite(team.id, inviteEmail, inviteRole)
      setInviteLink(res.data.invite_url)
      setInviteEmail('')
      toast.success('Invite link created!')
    } catch (e: any) {
      const msg = e?.response?.data?.detail
      toast.error(msg?.includes('already') ? 'Already a member.' : msg || 'Failed to invite')
    } finally { setInviting(false) }
  }

  const handleRemoveMember = async () => {
    if (!removingMember || !team) return
    try {
      await teamsApi.removeMember(team.id, removingMember.id)
      setMembers(prev => prev.filter(m => m.id !== removingMember.id))
      setRemovingMember(null)
      toast.success('Member removed')
    } catch { toast.error('Failed to remove member') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-brand" />
    </div>
  )

  // ── No team ──
  if (!team) return (
    <div className="max-w-2xl">
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}>
            <Users className="w-3.5 h-3.5 text-brand" />
            <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">Team</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-dark-500 text-sm mt-1">Collaborate with colleagues on shared context</p>
      </div>

      <div className="rounded-2xl p-8 text-center"
        style={{ background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)' }}>
          <Users className="w-8 h-8 text-brand opacity-60" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Create your team</h2>
        <p className="text-sm text-dark-500 mb-7 max-w-sm mx-auto leading-relaxed">
          Teams let you share context across members. Every teammate gets smarter answers from the shared workspace.
        </p>
        <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
          <input value={teamName} onChange={e => setTeamName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
            placeholder="e.g. Acme Engineering"
            className="px-4 py-3 rounded-xl text-sm text-center bg-dark-900/70 border border-white/7 text-white placeholder-dark-700 outline-none focus:border-brand/30 transition-colors" />
          <button onClick={handleCreateTeam} disabled={submitting || !teamName.trim()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Users className="w-4 h-4" /> Create Team</>}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Has team ──
  return (
    <div className="max-w-3xl">
      <style>{`
        @keyframes tmFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>

      <div className="mb-7" style={{ animation: 'tmFade 0.3s ease-out' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}>
            <Users className="w-3.5 h-3.5 text-brand" />
            <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">Team</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">{team.name}</h1>
        <p className="text-dark-500 text-sm mt-1">{members.length} member{members.length !== 1 ? 's' : ''} · Shared context workspace</p>
      </div>

      {/* Invite card */}
      <div className="rounded-2xl mb-4"
        style={{
          background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)', animation: 'tmFade 0.35s ease-out',
        }}>
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
              <UserPlus className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Invite Member</p>
              <p className="text-[10px] text-dark-600">Send an invite link to your teammate</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2.5">
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com" type="email"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-dark-900/70 border border-white/7 text-white placeholder-dark-700 outline-none focus:border-brand/30 transition-colors" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm bg-dark-900/70 border border-white/7 text-white outline-none">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Invite
            </button>
          </div>

          {inviteLink && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)' }}>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-green-900/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <p className="text-[11px] text-green-400 font-medium">Invite link ready — share this with your teammate</p>
              </div>
              <div className="flex gap-2 p-3">
                <input value={inviteLink} readOnly
                  className="flex-1 px-3 py-2 rounded-xl text-[11px] font-mono bg-dark-900/60 border border-white/5 text-dark-400 outline-none" />
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!') }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', color: '#22c55e' }}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', animation: 'tmFade 0.4s ease-out' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-dark-600" />
            <span className="text-[13px] font-semibold text-white">Members</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-dark-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {members.length}
            </span>
          </div>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {members.map((member, idx) => {
            const color = getAvatarColor(member.full_name || '')
            const isMe = member.id === user?.id
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-3.5 group transition-colors hover:bg-white/[0.01]"
                style={{ animation: `tmFade 0.3s ease-out ${idx * 0.04}s both` }}>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: color }}>
                    {(member.full_name || '?')[0]?.toUpperCase()}
                  </div>
                  {isMe && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-dark-900" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{member.full_name}</p>
                    {isMe && <span className="text-[9px] text-dark-600">(you)</span>}
                  </div>
                  <p className="text-[11px] text-dark-600 truncate">{member.email}</p>
                </div>

                <RoleBadge role={member.team_role} />

                {!isMe && (
                  <button onClick={() => setRemovingMember(member)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', color: '#3f3f46' }}
                    onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(220,38,38,0.1)'); (e.currentTarget.style.color = '#f87171') }}
                    onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.03)'); (e.currentTarget.style.color = '#3f3f46') }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmModal isOpen={!!removingMember} onClose={() => setRemovingMember(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Remove ${removingMember?.full_name} from the team?`}
        confirmLabel="Remove" isDangerous />
    </div>
  )
}
