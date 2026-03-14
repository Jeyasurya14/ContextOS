'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, Users } from 'lucide-react'

import { teamsApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'

export default function InvitationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { token: authToken, isInitialized } = useAuthStore()
  const { toast } = useToast()

  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const res = await teamsApi.getInvitation(params.token)
        setInvitation(res.data)
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || 'Invitation not found')
      } finally {
        setLoading(false)
      }
    }

    if (params.token) {
      loadInvitation()
    }
  }, [params.token, toast])

  const handleAccept = async () => {
    if (!params.token) return

    if (!authToken) {
      router.push(`/login?from=/invite/${params.token}`)
      return
    }

    setAccepting(true)
    try {
      const res = await teamsApi.acceptInvitation(params.token)
      toast.success(res.data.message || 'Invitation accepted')
      router.push('/dashboard/team')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : invitation ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Join {invitation.team.name}</h1>
                <p className="text-sm text-gray-400">You were invited as a {invitation.role}.</p>
              </div>
            </div>

            <div className="space-y-3 mb-8 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Invited email</span>
                <span className="text-gray-200 text-right">{invitation.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Team</span>
                <span className="text-gray-200 text-right">{invitation.team.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Role</span>
                <span className="text-gray-200 capitalize text-right">{invitation.role}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-center text-gray-200 hover:bg-gray-700 transition"
              >
                Back
              </Link>
              <button
                onClick={handleAccept}
                disabled={accepting || !isInitialized}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
                {authToken ? 'Accept Invitation' : 'Log In to Accept'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <h1 className="text-2xl font-semibold mb-2">Invitation Unavailable</h1>
            <p className="text-sm text-gray-400 mb-6">
              This invitation may have expired, already been used, or does not exist.
            </p>
            <Link
              href="/"
              className="inline-flex px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
