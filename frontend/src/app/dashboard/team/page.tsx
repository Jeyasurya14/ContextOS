'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Mail, Loader2, Trash2, Copy, Crown, Shield, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { teamsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const AVATAR_COLORS = ['#d97706','#8b5cf6','#3b82f6','#22c55e','#e01e5a','#f59e0b','#06b6d4','#a855f7']
const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

function RoleBadge({ role }: { role: string }) {
  const cfg = role === 'owner'
    ? { icon: Crown, color: '#f59e0b', bg: 'var(--brand-muted)', border: 'var(--brand-border)' }
    : role === 'admin'
    ? { icon: Shield, color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.2)' }
    : { icon: Users, color: 'var(--text-secondary)', bg: 'var(--bg-overlay)', border: 'var(--border-subtle)' }
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 600, textTransform: 'capitalize', background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon style={{ width: 10, height: 10 }} /> {role}
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <Loader2 className="anim-spin" style={{ width: 24, height: 24, color: 'var(--brand)' }} />
    </div>
  )

  // ── No team ──
  if (!team) return (
    <div className="anim-fade-up max-w-[600px]">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>Team</h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Collaborate with colleagues on shared context</p>
      </div>

      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', margin: '0 auto 20px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Create your team</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 360, margin: '0 auto 28px', lineHeight: 1.5 }}>
          Teams let you share context across members. Every teammate gets smarter answers from the shared workspace.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          <input
            value={teamName} onChange={e => setTeamName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
            placeholder="e.g. Acme Engineering"
            className="field-input"
            style={{ textAlign: 'center' }}
          />
          <button
            className="btn btn-primary"
            onClick={handleCreateTeam} disabled={submitting || !teamName.trim()}
            style={{ width: '100%', height: 42 }}
          >
            {submitting ? <Loader2 className="anim-spin" style={{ width: 16, height: 16 }} /> : <Users style={{ width: 16, height: 16 }} />}
            Create Team
          </button>
        </div>
      </div>
    </div>
  )

  // ── Has team ──
  return (
    <div className="anim-fade-up max-w-[800px]">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>{team.name}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{members.length} member{members.length !== 1 ? 's' : ''} · Shared context workspace</p>
      </div>

      {/* Invite card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Invite Member</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Send an invite link to your teammate</p>
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com" type="email"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              className="field-input"
              style={{ flex: 1, minWidth: 200 }}
            />
            <select
              value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="field-input"
              style={{ width: 120 }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
              className="btn btn-primary"
              style={{ flexShrink: 0 }}
            >
              {inviting ? <Loader2 className="anim-spin" style={{ width: 14, height: 14 }} /> : <Mail style={{ width: 14, height: 14 }} />}
              Invite
            </button>
          </div>

          {inviteLink && (
            <div style={{ marginTop: 16, borderRadius: 'var(--r-md)', background: 'var(--success-muted)', border: '1px solid var(--success-border)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--success-text)' }} />
                <p style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 500 }}>Invite link ready — share this with your teammate</p>
              </div>
              <div style={{ display: 'flex', gap: 12, padding: 16 }}>
                <input
                  value={inviteLink} readOnly
                  className="field-input"
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-base)' }}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!') }}
                  className="btn"
                  style={{ background: 'var(--success-muted)', border: '1px solid var(--success-border)', color: 'var(--success-text)' }}
                >
                  <Copy style={{ width: 14, height: 14 }} /> Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Members</span>
            <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{members.length}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {members.map((member, idx) => {
            const color = getAvatarColor(member.full_name || '')
            const isMe = member.id === user?.id

            return (
              <div
                key={member.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
                  borderBottom: idx === members.length - 1 ? 'none' : '1px solid var(--border-subtle)'
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, background: color }}>
                    {(member.full_name || '?')[0]?.toUpperCase()}
                  </div>
                  {isMe && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--bg-surface)' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.full_name}</p>
                    {isMe && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(you)</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</p>
                </div>

                <RoleBadge role={member.team_role} />

                {!isMe && (
                  <button
                    onClick={() => setRemovingMember(member)}
                    className="btn btn-ghost"
                    style={{ width: 32, height: 32, padding: 0, color: 'var(--text-tertiary)' }}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!removingMember} onClose={() => setRemovingMember(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Remove ${removingMember?.full_name} from the team?`}
        confirmLabel="Remove" isDangerous
      />
    </div>
  )
}
