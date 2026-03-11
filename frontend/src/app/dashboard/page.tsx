// frontend/src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Plug, FolderOpen, Zap } from 'lucide-react';
import { integrationsApi, projectsApi, queryApi } from '@/lib/api';
import type { IntegrationStatus, Project, ConversationSummary } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [integrations, setIntegrations] = useState<Record<string, IntegrationStatus>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [intRes, projRes, convRes] = await Promise.allSettled([
          integrationsApi.status(),
          projectsApi.list(),
          queryApi.conversations(),
        ]);
        if (intRes.status === 'fulfilled') setIntegrations(intRes.value.data);
        if (projRes.status === 'fulfilled') setProjects(projRes.value.data);
        if (convRes.status === 'fulfilled') setConversations(convRes.value.data);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const connectedCount = Object.values(integrations).filter((i) => i.connected).length;
  const totalChunks = Object.values(integrations).reduce((s, i) => s + (i.chunks || 0), 0);

  const stats = [
    { label: 'Integrations', value: `${connectedCount}/4`, icon: Plug, href: '/dashboard/integrations' },
    { label: 'Projects', value: projects.length, icon: FolderOpen, href: '/dashboard/projects' },
    { label: 'Conversations', value: conversations.length, icon: MessageSquare, href: '/dashboard/chat' },
    { label: 'Context Chunks', value: totalChunks.toLocaleString(), icon: Zap, href: '/dashboard/integrations' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-50 mb-1">
        Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
      </h1>
      <p className="text-dark-400 text-sm mb-8">Here&apos;s your project context overview.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-dark-900 border border-dark-700 rounded-xl p-5 hover:border-dark-600 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon className="w-5 h-5 text-dark-400" />
            </div>
            <p className="text-2xl font-bold text-dark-50">{s.value}</p>
            <p className="text-sm text-dark-400">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/chat"
          className="bg-brand/5 border border-brand/20 rounded-xl p-5 hover:bg-brand/10 transition"
        >
          <MessageSquare className="w-5 h-5 text-brand-light mb-2" />
          <h3 className="font-medium text-dark-50 mb-1">Ask a Question</h3>
          <p className="text-sm text-dark-400">Chat with ContextOS about your project</p>
        </Link>
        <Link
          href="/dashboard/integrations"
          className="bg-dark-900 border border-dark-700 rounded-xl p-5 hover:border-dark-600 transition"
        >
          <Plug className="w-5 h-5 text-dark-400 mb-2" />
          <h3 className="font-medium text-dark-50 mb-1">Connect Tools</h3>
          <p className="text-sm text-dark-400">Add GitHub, Notion, Slack, or VS Code</p>
        </Link>
      </div>

      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-dark-50 mb-3">Recent Conversations</h2>
          <div className="bg-dark-900 border border-dark-700 rounded-xl divide-y divide-dark-700">
            {conversations.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/chat?id=${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-dark-800 transition"
              >
                <div>
                  <p className="text-sm text-dark-100">{c.title}</p>
                  <p className="text-xs text-dark-400">{c.message_count} messages</p>
                </div>
                <span className="text-xs text-dark-500">
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
