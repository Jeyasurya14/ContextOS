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
    price: '₹999',
    period: '/month',
    features: ['Unlimited queries/day', 'Unlimited integrations', '100K context chunks', 'Team shared context', 'Priority support'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    key: 'team',
    name: 'Team',
    price: '₹2,999',
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

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'free' || planKey === currentPlan) return
    
    setUpgrading(planKey)
    try {
      const response = await billingApi.createOrder(planKey)
      const { order_id, amount, currency, key } = response.data

      if (!window.Razorpay) {
        toast.error('Payment gateway not loaded. Please refresh the page.')
        setUpgrading(null)
        return
      }

      const options = {
        key,
        amount,
        currency,
        name: 'ContextOS',
        description: `Upgrade to ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan`,
        order_id,
        handler: async (response: any) => {
          try {
            await billingApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
            })
            toast.success('Payment successful! Your plan has been upgraded.')
            await refreshUser()
            await loadUsage()
          } catch (err: any) {
            toast.error('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          email: user?.email || '',
          name: user?.name || '',
        },
        theme: {
          color: '#8B5CF6',
        },
        modal: {
          ondismiss: () => {
            setUpgrading(null)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to initiate payment')
      setUpgrading(null)
    }
  }

  const currentPlan = user?.plan || 'free'
  const usagePercent = usage?.queries_count && usage?.queries_limit
    ? Math.min((usage.queries_count / usage.queries_limit) * 100, 100)
    : 0

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

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
              className={`card relative animate-slide-up flex flex-col ${
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
              <ul className="space-y-2 mb-6 flex-grow">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-dark-300">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || upgrading !== null}
                onClick={() => handleUpgrade(plan.key)}
                className={`w-full mt-auto py-2 rounded-lg font-medium transition ${
                  isCurrent
                    ? 'bg-dark-700 text-dark-400 cursor-not-allowed'
                    : plan.highlight
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'border border-dark-600 text-dark-200 hover:bg-dark-800'
                } disabled:opacity-50`}
              >
                {upgrading === plan.key ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : isCurrent ? (
                  'Current Plan'
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
