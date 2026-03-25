// frontend/src/components/ui/UpgradeBanner.tsx
'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function UpgradeBanner() {
  const { user } = useAuthStore();

  if (!user || user.plan !== 'free') return null;

  return (
    <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 text-brand-light flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-dark-50">
            Upgrade to Pro for unlimited queries
          </p>
          <p className="text-xs text-dark-400">
            Starting at ₹1,667/month — unlimited queries, integrations & team context.
          </p>
        </div>
      </div>
      <div
        className="bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed whitespace-nowrap"
        title="Payments coming soon"
      >
        Coming Soon
      </div>
    </div>
  );
}
