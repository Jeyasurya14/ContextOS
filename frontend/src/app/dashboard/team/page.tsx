'use client'

import { useEffect, useState } from 'react'
import {
  Users, Loader2, Trash2, Copy, ChevronRight, Plus, Mail, CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { teamsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const AVATAR_COLORS = ['#94a3b8', '#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#f472b6', '#22d3ee']
const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === 'owner'
  return (
    <span className={`status-pill ${isOwner ? 'status-live' : 'status-suspended'}`} style={{ textTransform: 'capitalize' }}>
      <span className="status-pill-dot" />
      {role}
    </span>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function TeamPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
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
    } catch {}
    finally { setLoading(false) }
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return
    setSubmitting(true)
    try {
      const res = await teamsApi.create(teamName)
      setTeam(res.data)
      setMembers([{ ...user, full_name: user?.name, team_role: 'owner' }])
      toast.success('Team created')
    } catch { toast.error('Failed to create team') }
    finally { setSubmitting(false) }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await teamsApi.invite(team.id, inviteEmail, 'member')
      setInviteLink(res.data.invite_url)
      setInviteEmail('')
      toast.success('Invite link generated')
    } catch { toast.error('Invite failed') }
    finally { setInviting(false) }
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <Loader2 className="anim-spin" style={{ color: 'var(--text-tertiary)' }} />
    </div>
  )

  // No team yet — onboarding
  if (!team) return (
    <div className="anim-fade-up" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
          <span>ContextOS</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-secondary)' }}>Team</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Team
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
          Create a team to share context with collaborators.
        </p>
      </div>

      <div className="surface" style={{ padding: 40, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-base)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Users size={20} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.015em' }}>
          Create your team
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24 }}>
          Collaborate with teammates on a shared knowledge base.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="field-input"
            placeholder="Team name"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
          />
          <button className="btn btn-primary btn-md btn-full" onClick={handleCreateTeam} disabled={!teamName.trim() || submitting}>
            {submitting ? <Loader2 size={14} className="anim-spin" /> : <Plus size={14} />}
            Create team
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="anim-fade-up" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              <span>ContextOS</span>
              <ChevronRight size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>Team</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {team.name}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {members.length} {members.length === 1 ? 'member' : 'members'} · Manage team and invites.
            </p>
          </div>
        </div>
      </div>

      {/* Invite panel */}
      <section className="surface" style={{ marginBottom: 24 }}>
        <header style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>
            Invite member
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Send an invitation link to a collaborator.
          </p>
        </header>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 12px',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-base)',
              borderRadius: 8,
              flex: 1,
            }}>
              <Mail size={14} style={{ color: 'var(--text-tertiary)' }} />
              <input
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 13, flex: 1,
                  height: 36,
                }}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting}
            >
              {inviting ? <Loader2 size={13} className="anim-spin" /> : <Plus size={13} />}
              Send invite
            </button>
          </div>

          {inviteLink && (
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'var(--bg-base)',
              border: '1px solid var(--brand-border)',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--brand-text)', marginBottom: 8 }}>
                <CheckCircle2 size={13} />
                Invite link ready — valid for 7 days
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  readOnly
                  value={inviteLink}
                  style={{
                    flex: 1,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-base)',
                    color: 'var(--text-secondary)',
                    padding: '8px 12px',
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied to clipboard') }}
                >
                  <Copy size={13} /> Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Members */}
      <section className="surface">
        <header style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>Members</h2>
          <span style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-tertiary)', background: 'var(--bg-raised)',
            padding: '2px 8px', borderRadius: 999,
          }}>
            {members.length}
          </span>
        </header>

        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Joined</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const isMe = m.id === user?.id
              return (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: getAvatarColor(m.full_name || m.email || ''),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600, color: '#000',
                        flexShrink: 0,
                      }}>
                        {(m.full_name || m.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.full_name || m.email}
                          {isMe && (
                            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                              (you)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {m.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadge role={m.team_role} />
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {!isMe && m.team_role !== 'owner' && (
                      <button
                        className="btn btn-ghost"
                        style={{ width: 30, height: 30, padding: 0 }}
                        onClick={() => setRemovingMember(m)}
                        title="Remove member"
                      >
                        <Trash2 size={13} style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <ConfirmModal
        isOpen={!!removingMember}
        onClose={() => setRemovingMember(null)}
        onConfirm={async () => {
          await teamsApi.removeMember(team.id, removingMember.id)
          toast.success('Member removed')
          loadTeam()
          setRemovingMember(null)
        }}
        title="Remove member"
        message={`Remove ${removingMember?.full_name || removingMember?.email} from ${team.name}? They will lose access immediately.`}
        confirmLabel="Remove"
        isDangerous
      />
    </div>
  )
}
