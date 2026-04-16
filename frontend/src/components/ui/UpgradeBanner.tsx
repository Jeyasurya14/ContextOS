// frontend/src/components/ui/UpgradeBanner.tsx
'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function UpgradeBanner() {
  const { user } = useAuthStore();

  if (!user || user.plan !== 'free') return null;

  return (
    <div className="bg-brand/8 border border-brand/15 rounded-xl p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-0.5">
            Upgrade to Pro for unlimited queries
          </p>
          <p className="text-xs text-[#9ca3af]">
            Starting at ₹1,667/month — unlimited queries, integrations & team context.
          </p>
        </div>
      </div>
      <div
        className="bg-[#4b5563] text-[#d1d5db] px-5 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed whitespace-nowrap"
        title="Payments coming soon"
      >
        Coming Soon
      </div>
    </div>
  );
}
