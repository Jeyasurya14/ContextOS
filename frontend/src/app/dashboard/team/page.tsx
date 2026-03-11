// frontend/src/app/dashboard/team/page.tsx
'use client';

import { useState } from 'react';
import { Users, UserPlus, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function TeamPage() {
  const { user } = useAuthStore();
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  const hasTeam = !!user?.team_id;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      // Team creation will be implemented in Phase 4
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      // handle silently
    } finally {
      setCreating(false);
    }
  };

  if (!hasTeam) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark-50 mb-1">Team</h1>
        <p className="text-dark-400 text-sm mb-8">Create a team to share context with collaborators.</p>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-8 max-w-lg">
          <Users className="w-10 h-10 text-dark-500 mb-4" />
          <h2 className="text-lg font-semibold text-dark-50 mb-2">Create a Team</h2>
          <p className="text-sm text-dark-400 mb-6">
            Teams let you share context across members. Everyone gets smarter answers based on shared knowledge.
          </p>
          <form onSubmit={handleCreateTeam} className="space-y-3">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              required
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:border-brand transition"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-dark transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-50 mb-1">Team</h1>
          <p className="text-dark-400 text-sm">Manage your team members and invitations.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-dark transition">
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="bg-dark-900 border border-dark-700 rounded-xl">
        <div className="p-4 border-b border-dark-700">
          <h2 className="font-medium text-dark-50">Members</h2>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand/20 rounded-full flex items-center justify-center text-brand-light text-sm font-medium">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm text-dark-100">{user?.full_name || 'You'}</p>
                <p className="text-xs text-dark-400">{user?.email}</p>
              </div>
            </div>
            <span className="text-xs bg-brand/10 text-brand-light px-2 py-0.5 rounded-full">
              {user?.team_role || 'Owner'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-dark-900 border border-dark-700 rounded-xl mt-4">
        <div className="p-4 border-b border-dark-700">
          <h2 className="font-medium text-dark-50">Pending Invitations</h2>
        </div>
        <div className="p-8 text-center">
          <Mail className="w-8 h-8 text-dark-500 mx-auto mb-2" />
          <p className="text-sm text-dark-400">No pending invitations</p>
        </div>
      </div>
    </div>
  );
}
