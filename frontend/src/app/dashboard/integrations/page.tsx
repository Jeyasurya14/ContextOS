// frontend/src/app/dashboard/integrations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Github, FileText, MessageSquare, Code2, RefreshCw, Link2, Unlink } from 'lucide-react';
import { integrationsApi } from '@/lib/api';
import type { IntegrationStatus } from '@/lib/api';

const providers = [
  { key: 'vscode', label: 'VS Code', icon: Code2, color: 'text-blue-400', desc: 'Workspace files, diagnostics, git log' },
  { key: 'github', label: 'GitHub', icon: Github, color: 'text-gray-300', desc: 'Commits, PRs, issues, webhooks' },
  { key: 'notion', label: 'Notion', icon: FileText, color: 'text-gray-300', desc: 'Pages, databases, knowledge base' },
  { key: 'slack', label: 'Slack', icon: MessageSquare, color: 'text-purple-400', desc: 'Channels, messages, threads' },
];

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const res = await integrationsApi.status();
      setStatuses(res.data);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    try {
      let res;
      switch (provider) {
        case 'github':
          res = await integrationsApi.githubConnect();
          break;
        case 'notion':
          res = await integrationsApi.notionConnect();
          break;
        case 'slack':
          res = await integrationsApi.slackConnect();
          break;
        default:
          return;
      }
      if (res?.data?.oauth_url) {
        window.location.href = res.data.oauth_url;
      }
    } catch {
      // handle silently
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      switch (provider) {
        case 'github':
          await integrationsApi.githubDisconnect();
          break;
        case 'notion':
          await integrationsApi.notionDisconnect();
          break;
        case 'slack':
          await integrationsApi.slackDisconnect();
          break;
      }
      await loadStatuses();
    } catch {
      // handle silently
    }
  };

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    try {
      switch (provider) {
        case 'notion':
          await integrationsApi.notionSync();
          break;
        case 'slack':
          await integrationsApi.slackSync();
          break;
      }
    } catch {
      // handle silently
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-50 mb-1">Integrations</h1>
      <p className="text-dark-400 text-sm mb-8">Connect your tools to build context for ContextOS.</p>

      <div className="grid md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const status = statuses[p.key];
          const connected = status?.connected || false;

          return (
            <div key={p.key} className="bg-dark-900 border border-dark-700 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <p.icon className={`w-6 h-6 ${p.color}`} />
                  <div>
                    <h3 className="font-medium text-dark-50">{p.label}</h3>
                    <p className="text-xs text-dark-400">{p.desc}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    connected
                      ? 'bg-success/10 text-success'
                      : 'bg-dark-700 text-dark-400'
                  }`}
                >
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              {connected && (
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="bg-dark-800 rounded-lg p-2">
                    <p className="text-lg font-bold text-dark-50">{status?.chunks || 0}</p>
                    <p className="text-xs text-dark-400">Chunks</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-2">
                    <p className="text-xs text-dark-200 truncate">{status?.username || '—'}</p>
                    <p className="text-xs text-dark-400">Account</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-2">
                    <p className="text-xs text-dark-200">
                      {status?.last_synced
                        ? new Date(status.last_synced).toLocaleDateString()
                        : 'Never'}
                    </p>
                    <p className="text-xs text-dark-400">Last Sync</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {connected ? (
                  <>
                    {p.key !== 'vscode' && (
                      <button
                        onClick={() => handleSync(p.key)}
                        disabled={syncing === p.key}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-dark-800 border border-dark-600 text-dark-200 text-sm py-2 rounded-lg hover:bg-dark-700 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing === p.key ? 'animate-spin' : ''}`} />
                        Sync
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(p.key)}
                      className="flex items-center justify-center gap-1.5 bg-dark-800 border border-danger/30 text-danger text-sm py-2 px-4 rounded-lg hover:bg-danger/10 transition"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(p.key)}
                    disabled={p.key === 'vscode'}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white text-sm py-2 rounded-lg hover:bg-brand-dark transition disabled:opacity-50"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {p.key === 'vscode' ? 'Install Extension' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
