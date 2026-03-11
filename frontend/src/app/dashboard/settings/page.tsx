// frontend/src/app/dashboard/settings/page.tsx
'use client';

import { useState } from 'react';
import { Key, Copy, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const res = await authApi.generateApiKey();
      setNewKey(res.data.api_key);
    } catch {
      // handle silently
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-50 mb-1">Settings</h1>
      <p className="text-dark-400 text-sm mb-8">Manage your account and API keys.</p>

      {/* Profile */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 mb-6">
        <h2 className="font-medium text-dark-50 mb-4">Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-dark-400 mb-1">Name</label>
            <p className="text-sm text-dark-100">{user?.full_name || '—'}</p>
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">Email</label>
            <p className="text-sm text-dark-100">{user?.email || '—'}</p>
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">Plan</label>
            <p className="text-sm text-dark-100 capitalize">{user?.plan || 'free'}</p>
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">Member since</label>
            <p className="text-sm text-dark-100">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-dark-400" />
            <h2 className="font-medium text-dark-50">API Key</h2>
          </div>
          <button
            onClick={handleGenerateKey}
            disabled={generating}
            className="bg-brand text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-dark transition disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate New Key'}
          </button>
        </div>

        {user?.api_key_prefix && (
          <p className="text-sm text-dark-400 mb-3">
            Current key: <code className="text-dark-200">{user.api_key_prefix}••••••••</code>
          </p>
        )}

        {newKey && (
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
            <p className="text-sm text-warning font-medium mb-2">
              Copy this key now — it will never be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-dark-800 text-dark-100 px-3 py-2 rounded text-xs font-mono break-all">
                {newKey}
              </code>
              <button
                onClick={handleCopy}
                className="bg-dark-800 text-dark-200 px-3 py-2 rounded hover:bg-dark-700 transition text-sm flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-dark-900 border border-danger/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-danger" />
          <h2 className="font-medium text-danger">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-100">Clear all context</p>
              <p className="text-xs text-dark-400">Remove all synced context chunks from your account.</p>
            </div>
            <button className="border border-danger/30 text-danger text-sm px-3 py-1.5 rounded-lg hover:bg-danger/10 transition">
              Clear Context
            </button>
          </div>
          <div className="border-t border-dark-700 pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-100">Delete account</p>
              <p className="text-xs text-dark-400">Permanently delete your account and all data.</p>
            </div>
            <button className="border border-danger/30 text-danger text-sm px-3 py-1.5 rounded-lg hover:bg-danger/10 transition">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
