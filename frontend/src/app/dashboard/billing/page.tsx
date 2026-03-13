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
    setUpgrading(plan)
    try {
      const res = await billingApi.createOrder(plan)
      const options = {
        key: res.data.razorpay_key_id,
        amount: res.data.amount,
        currency: res.data.currency,
        name: 'ContextOS',
        description: `ContextOS ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        order_id: res.data.order_id,
        handler: async (response: any) => {
          try {
            await billingApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            })
            await refreshUser()
            toast.success(`Successfully upgraded to ${plan}!`)
          } catch (err: any) {
            toast.error('Payment verification failed. Contact support if amount was deducted.')
          } finally {
            setUpgrading(null)
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#3b82f6' },
        modal: {
          ondismiss: () => {
            setUpgrading(null)
          },
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create order')
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

      <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
      <p className="text-gray-400 text-sm mb-8">Manage your plan and usage.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <div>
              <h2 className="font-medium text-white">Current Plan</h2>
              <p className="text-sm text-gray-400 capitalize">{currentPlan}</p>
            </div>
          </div>
          <span className="bg-blue-600/10 text-blue-400 px-3 py-1 rounded-full text-xs font-medium capitalize">
            {currentPlan}
          </span>
        </div>
        {!loading && usage && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Queries this month</span>
              <span className="text-gray-200">
                {currentPlan === 'free' ? `${usage.queries_count || 0} / ${usage.queries_limit || 50}` : 'Unlimited'}
              </span>
            </div>
            {currentPlan === 'free' && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${usagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Plans</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan
          const isUpgrading = upgrading === plan.key
          return (
            <div
              key={plan.key}
              className={`bg-gray-900 border rounded-xl p-6 ${
                plan.highlight ? 'border-blue-600' : 'border-gray-800'
              } relative`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-0.5 rounded-full">
                  Recommended
                </div>
              )}
              <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
              <p className="text-2xl font-bold text-white mb-4">
                {plan.price}
                <span className="text-sm text-gray-400 font-normal">{plan.period}</span>
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || isUpgrading || plan.key === 'free'}
                onClick={() => handleUpgrade(plan.key)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                  isCurrent || plan.key === 'free'
                    ? 'bg-gray-800 text-gray-500 cursor-default'
                    : plan.highlight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700'
                }`}
              >
                {isUpgrading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCurrent ? 'Current Plan' : isUpgrading ? 'Processing...' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
