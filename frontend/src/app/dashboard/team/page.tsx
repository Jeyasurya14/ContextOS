'use client'

import { useEffect, useState } from 'react'
import { 
  Users, UserPlus, Mail, Loader2, Trash2, Copy, Crown, Shield, 
  CheckCircle2, Fingerprint, Activity, Clock, MoreHorizontal, Plus
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { teamsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const AVATAR_COLORS = ['#d97706','#8b5cf6','#3b82f6','#22c55e','#e01e5a','#f59e0b','#06b6d4','#a855f7']
const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === 'owner'
  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: 4, 
      padding: '2px 8px', borderRadius: '4px', fontSize: 10, fontWeight: 700, 
      textTransform: 'uppercase', letterSpacing: '0.04em',
      background: isOwner ? 'var(--brand-muted)' : 'var(--bg-subtle)',
      border: `1px solid ${isOwner ? 'var(--brand-border)' : 'var(--border-subtle)'}`,
      color: isOwner ? 'var(--brand-text)' : 'var(--text-tertiary)'
    }}>
      {role}
    </span>
  )
}

/* ─── Team Row ─── */
function MemberRow({ member, isMe, onRemove }: any) {
  return (
    <div style={{ 
      display: 'grid', gridTemplateColumns: 'minmax(240px, 2fr) 1fr 1fr 120px 40px',
      padding: '12px 24px', alignItems: 'center', gap: 16,
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-base)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
         <div style={{ 
           width: 32, height: 32, borderRadius: 'var(--r-md)', 
           background: getAvatarColor(member.full_name || ''), 
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           fontSize: 12, fontWeight: 800, color: 'white'
         }}>
           {(member.full_name || '?')[0].toUpperCase()}
         </div>
         <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
               {member.full_name} {isMe && <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 400 }}>(You)</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{member.email}</div>
         </div>
      </div>

      <RoleBadge role={member.team_role} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
         <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
         <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Operator Active</span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>{new Date().toLocaleDateString()}</div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
         {!isMe && (
           <button className="btn btn-ghost btn-sm" style={{ width: 28, height: 28, padding: 0 }} onClick={()=>onRemove(member)}>
              <Trash2 size={13} style={{ color: 'var(--text-disabled)' }} />
           </button>
         )}
      </div>
    </div>
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
    setSubmitting(true)
    try {
      const res = await teamsApi.create(teamName)
      setTeam(res.data)
      setMembers([{ ...user, full_name: user?.name, team_role: 'owner' }])
      toast.success('Team Registry Initialized')
    } catch { toast.error('Creation failure') }
    finally { setSubmitting(false) }
  }

  const handleInvite = async () => {
    setInviting(true)
    try {
      const res = await teamsApi.invite(team.id, inviteEmail, 'member')
      setInviteLink(res.data.invite_url)
      setInviteEmail('')
      toast.success('Invite Stream Generated')
    } catch { toast.error('Invite failure') }
    finally { setInviting(false) }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><Loader2 className="anim-spin" /></div>

  if (!team) return (
     <div className="anim-fade-up" style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
           <Users size={32} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Establish Team Protocol</h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 400, textAlign: 'center', marginBottom: 32 }}>Collective intelligence requires a shared hub. Invite operators to synchronize across global context.</p>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
           <input className="field-input" placeholder="Organization Cluster Name" value={teamName} onChange={e=>setTeamName(e.target.value)} style={{ textAlign: 'center' }} />
           <button className="btn btn-primary btn-full" onClick={handleCreateTeam} disabled={!teamName.trim() || submitting}>
              Initialize Team
           </button>
        </div>
     </div>
  )

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Operational Overview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
         <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
               <Fingerprint size={20} />
            </div>
            <div>
               <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Workspace Hub</div>
               <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{team.name}</div>
            </div>
         </div>
         <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
               <Activity size={20} />
            </div>
            <div>
               <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Active Operators</div>
               <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{members.length} Ready</div>
            </div>
         </div>
      </div>

      {/* ── Invite Pipeline ── */}
      <div className="card">
         <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-base)', background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
               <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Operator Provisioning</h3>
               <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Provision new access grants for workspace collaborators.</p>
            </div>
         </div>
         <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 12 }}>
               <input className="field-input" placeholder="operator@domain.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={{ flex: 1 }} />
               <button className="btn btn-primary" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                  {inviting ? 'Generating...' : 'Provision Access'}
               </button>
            </div>
            {inviteLink && (
               <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>Secure Invitation Token</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                     <input readOnly value={inviteLink} style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: 8, fontSize: 11, fontFamily: 'monospace', borderRadius: '4px' }} />
                     <button className="btn btn-secondary" onClick={()=>{navigator.clipboard.writeText(inviteLink); toast.success('Token Copied')}}><Copy size={14} /></button>
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* ── Member Registry ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
         <div style={{ 
           display: 'grid', gridTemplateColumns: 'minmax(240px, 2fr) 1fr 1fr 120px 40px',
           padding: '10px 24px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-base)',
           fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase'
         }}>
            <span>Operator Identity</span>
            <span>Grant Level</span>
            <span>Sync Status</span>
            <span style={{ textAlign: 'right' }}>Registered</span>
            <span></span>
         </div>
         <div>
            {members.map(m => (
               <MemberRow key={m.id} member={m} isMe={m.id === user?.id} onRemove={setRemovingMember} />
            ))}
         </div>
      </div>

      <ConfirmModal 
        isOpen={!!removingMember} 
        onClose={()=>setRemovingMember(null)} 
        onConfirm={async ()=>{ await teamsApi.removeMember(team.id, removingMember.id); toast.success('Member Removed'); loadTeam(); setRemovingMember(null); }}
        title="Revoke Membership"
        message={`Sever workspace access for ${removingMember?.full_name}?`}
        isDangerous
      />

    </div>
  )
}
