'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MessageSquare, Sparkles, FolderOpen, Plug, TrendingUp, Activity, Calendar, Loader2 } from 'lucide-react'
import { analyticsApi } from '@/lib/api'
import { format, parseISO } from 'date-fns'

const COLORS = ['#fbbf24', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c']

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [conversations, setConversations] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any>(null)
  const [prompts, setPrompts] = useState<any>(null)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    load()
  }, [period])

  const load = async () => {
    setLoading(true)
    try {
      const [overviewRes, convRes, intRes, promptRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getConversations(period),
        analyticsApi.getIntegrations(),
        analyticsApi.getPrompts(),
      ])
      setOverview(overviewRes.data)
      setConversations(convRes.data)
      setIntegrations(intRes.data)
      setPrompts(promptRes.data)
    } catch (err) {
      console.error('Analytics load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Loader2 className="spin" size={24} style={{ marginInline: 'auto', color: 'var(--text-tertiary)' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
              Analytics
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
              Insights into your usage and activity
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`btn btn-sm ${period === d ? 'btn-primary' : 'btn-secondary'}`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={<MessageSquare size={18} />}
          label="Conversations"
          value={overview?.total_conversations || 0}
          color="#fbbf24"
        />
        <StatCard
          icon={<Sparkles size={18} />}
          label="Prompts"
          value={overview?.total_prompts || 0}
          color="#60a5fa"
        />
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Projects"
          value={overview?.total_projects || 0}
          color="#34d399"
        />
        <StatCard
          icon={<Plug size={18} />}
          label="Integrations"
          value={overview?.total_integrations || 0}
          color="#a78bfa"
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 20 }}>
        
        {/* Conversation Activity */}
        {conversations?.messages_by_day && conversations.messages_by_day.length > 0 && (
          <ChartCard title="Conversation Activity" subtitle={`Last ${period} days`}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversations.messages_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-tertiary)"
                  fontSize={11}
                  tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-base)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#fbbf24" 
                  strokeWidth={2}
                  dot={{ fill: '#fbbf24', r: 3 }}
                  name="Messages"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Integration Distribution */}
        {integrations?.integrations_by_provider && integrations.integrations_by_provider.length > 0 && (
          <ChartCard title="Integration Distribution" subtitle="By provider">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={integrations.integrations_by_provider}
                  dataKey="total_chunks"
                  nameKey="provider"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => entry.provider}
                >
                  {integrations.integrations_by_provider.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-base)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Most Used Prompts */}
        {prompts?.most_used_prompts && prompts.most_used_prompts.length > 0 && (
          <ChartCard title="Most Used Prompts" subtitle="Top 10 by usage">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={prompts.most_used_prompts.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis type="number" stroke="var(--text-tertiary)" fontSize={11} />
                <YAxis 
                  type="category" 
                  dataKey="title" 
                  stroke="var(--text-tertiary)" 
                  fontSize={11}
                  width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-base)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="usage_count" fill="#60a5fa" name="Uses" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Conversation Stats */}
        {conversations && (
          <ChartCard title="Conversation Metrics" subtitle={`Last ${period} days`}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <MetricRow
                label="Total Conversations"
                value={conversations.total_conversations}
                icon={<MessageSquare size={16} />}
              />
              <MetricRow
                label="Total Messages"
                value={conversations.total_messages}
                icon={<Activity size={16} />}
              />
              <MetricRow
                label="Avg Messages/Conversation"
                value={conversations.avg_messages_per_conversation}
                icon={<TrendingUp size={16} />}
              />
            </div>
          </ChartCard>
        )}
      </div>

      {/* Summary Stats */}
      {integrations && (
        <div style={{ marginTop: 32 }}>
          <div className="surface" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
              Integration Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Chunks</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {integrations.total_chunks?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Active Providers</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {integrations.integrations_by_provider?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="surface" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: any }) {
  return (
    <div className="surface" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function MetricRow({ label, value, icon }: { label: string; value: number; icon: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: 'var(--text-tertiary)' }}>{icon}</div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}
