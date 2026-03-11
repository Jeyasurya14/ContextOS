// frontend/src/app/dashboard/billing/page.tsx
'use client';

import { CreditCard, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['50 queries/day', '3 integrations', '10K context chunks', 'Community support'],
    current: true,
    cta: 'Current Plan',
  },
  {
    name: 'Pro',
    price: '$20',
    period: '/month',
    features: ['1,000 queries/day', 'Unlimited integrations', '100K context chunks', 'Team shared context', 'Priority support'],
    current: false,
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited queries', 'Unlimited integrations', 'Unlimited chunks', 'SSO & SAML', 'Dedicated support', 'Custom SLA'],
    current: false,
    cta: 'Contact Sales',
  },
];

export default function BillingPage() {
  const { user } = useAuthStore();
  const currentPlan = user?.plan || 'free';

  const usagePercent = 30;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-50 mb-1">Billing</h1>
      <p className="text-dark-400 text-sm mb-8">Manage your plan and usage.</p>

      {/* Current Plan */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-dark-400" />
            <div>
              <h2 className="font-medium text-dark-50">Current Plan</h2>
              <p className="text-sm text-dark-400 capitalize">{currentPlan}</p>
            </div>
          </div>
          <span className="bg-brand/10 text-brand-light px-3 py-1 rounded-full text-xs font-medium capitalize">
            {currentPlan}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Daily queries used</span>
            <span className="text-dark-200">15 / 50</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usagePercent > 80 ? 'bg-danger' : 'bg-brand'}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-lg font-semibold text-dark-50 mb-4">Plans</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.name.toLowerCase() === currentPlan;
          return (
            <div
              key={plan.name}
              className={`bg-dark-900 border rounded-xl p-6 ${
                plan.highlight ? 'border-brand' : 'border-dark-700'
              } relative`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-3 py-0.5 rounded-full">
                  Recommended
                </div>
              )}
              <h3 className="text-lg font-semibold text-dark-50 mb-1">{plan.name}</h3>
              <p className="text-2xl font-bold text-dark-50 mb-4">
                {plan.price}
                <span className="text-sm text-dark-400 font-normal">{plan.period}</span>
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-dark-300">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                  isCurrent
                    ? 'bg-dark-700 text-dark-400 cursor-default'
                    : plan.highlight
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'bg-dark-800 border border-dark-600 text-dark-200 hover:bg-dark-700'
                }`}
              >
                {isCurrent ? 'Current Plan' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
