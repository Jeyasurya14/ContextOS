'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Activity, Database, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react'
import { adminApi } from '@/lib/api'

interface Stats {
  users: {
    total: number
    active: number
    inactive: number
  }
  plans: {
    free: number
    pro: number
    team: number
  }
  integrations: {
    total: number
    active: number
  }
  context_chunks: number
  conversations: number
  teams: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data } = await adminApi.getStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dark-400">Loading...</div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total,
      icon: Users,
      change: `${stats.users.active} active`,
      color: 'brand',
    },
    {
      title: 'Integrations',
      value: stats.integrations.total,
      icon: Activity,
      change: `${stats.integrations.active} active`,
      color: 'success',
    },
    {
      title: 'Context Chunks',
      value: stats.context_chunks.toLocaleString(),
      icon: Database,
      change: 'Total stored',
      color: 'warning',
    },
    {
      title: 'Conversations',
      value: stats.conversations.toLocaleString(),
      icon: MessageSquare,
      change: 'All time',
      color: 'brand',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-dark-400">Overview of ContextOS platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-${stat.color}/10`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
            </div>
            <h3 className="text-dark-400 text-sm mb-1">{stat.title}</h3>
            <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
            <p className="text-sm text-dark-500">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Plan Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-dark-300">Free Plan</span>
                <span className="text-white font-medium">{stats.plans.free}</span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div
                  className="bg-dark-500 h-2 rounded-full"
                  style={{ width: `${(stats.plans.free / stats.users.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-dark-300">Pro Plan</span>
                <span className="text-white font-medium">{stats.plans.pro}</span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div
                  className="bg-brand h-2 rounded-full"
                  style={{ width: `${(stats.plans.pro / stats.users.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-dark-300">Team Plan</span>
                <span className="text-white font-medium">{stats.plans.team}</span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div
                  className="bg-success h-2 rounded-full"
                  style={{ width: `${(stats.plans.team / stats.users.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">User Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-dark-300">Active Users</span>
              </div>
              <span className="text-xl font-bold text-white">{stats.users.active}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-warning" />
                <span className="text-dark-300">Inactive Users</span>
              </div>
              <span className="text-xl font-bold text-white">{stats.users.inactive}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-brand" />
                <span className="text-dark-300">Teams</span>
              </div>
              <span className="text-xl font-bold text-white">{stats.teams}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
