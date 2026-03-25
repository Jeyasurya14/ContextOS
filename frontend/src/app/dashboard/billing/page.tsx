// frontend/src/app/dashboard/billing/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { CreditCard, Check, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { billingApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: '₹0',
    period: '/month',
    features: ['50 queries/day', '3 integrations', '10K context chunks', 'Community support'],
    cta: 'Current Plan',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '₹1,667',
    period: '/month',
    features: ['Unlimited queries/day', 'Unlimited integrations', '100K context chunks', 'Team shared context', 'Priority support'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    key: 'team',
    name: 'Team',
    price: '₹8,282',
    period: '/month',
    features: ['Unlimited queries/day', 'Unlimited integrations', 'Unlimited context chunks', 'Unlimited team members', 'SSO & SAML', 'Dedicated support', 'Custom SLA'],
    cta: 'Upgrade to Team',
  },
];

export default function BillingPage() {
  const { user, refreshUser } = useAuthStore()
  const { toast } = useToast()
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    loadUsage()
  }, [])

  const loadUsage = async () => {
    try {
      const res = await billingApi.getUsage()
      setUsage(res.data)
    } catch (err: any) {
      toast.error('Failed to load usage data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: string) => {
    toast.info('Payments are coming soon! Stay tuned for updates.')
  }

  const currentPlan = user?.plan || 'free'
  const usagePercent = usage?.queries_count && usage?.queries_limit
    ? Math.min((usage.queries_count / usage.queries_limit) * 100, 100)
    : 0

  return (
    <div>
      {/* Razorpay script is not needed until payments are live */}
      {/* <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" /> */}

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6 animate-slide-up">
        <p className="text-warning text-sm">
          <strong>Coming Soon:</strong> Payment processing is currently under development.
          All upgrade buttons are disabled. Stay tuned for the launch!
        </p>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">Billing</h1>
      <p className="text-dark-400 text-sm mb-8">Manage your plan and usage</p>

      <div className="card mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-dark-300" />
            <div>
              <h2 className="font-medium text-white">Current Plan</h2>
              <p className="text-sm text-dark-400 capitalize">{currentPlan}</p>
            </div>
          </div>
          <span className="badge badge-neutral capitalize">
            {currentPlan}
          </span>
        </div>
        {!loading && usage && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Queries this month</span>
              <span className="text-dark-200">
                {currentPlan === 'free' ? `${usage.queries_count || 0} / ${usage.queries_limit || 50}` : 'Unlimited'}
              </span>
            </div>
            {currentPlan === 'free' && (
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${usagePercent > 80 ? 'bg-danger' : 'bg-brand'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Plans</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan, index) => {
          const isCurrent = plan.key === currentPlan
          return (
            <div
              key={plan.key}
              className={`card relative animate-slide-up ${
                plan.highlight ? 'border-brand/50' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.highlight && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}
              <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
              <p className="text-2xl font-bold text-white mb-4">
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
                disabled={true}
                onClick={() => handleUpgrade(plan.key)}
                className="btn btn-secondary disabled:opacity-50 cursor-not-allowed w-full flex"
              >
                Coming Soon
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
