// frontend/src/app/dashboard/billing/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { CreditCard, Check, Loader2, Sparkles, Zap, Crown, Shield, ChevronRight } from 'lucide-react'
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
    icon: Zap,
    features: ['25 queries/day', '3 integrations', '10K context chunks', 'Community support'],
    cta: 'Current Plan',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '₹999',
    period: '/month',
    icon: Crown,
    features: ['Unlimited queries/day', 'Unlimited integrations', '100K context chunks', 'Team shared context', 'Priority support'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    key: 'team',
    name: 'Team',
    price: '₹2,999',
    period: '/month',
    icon: Shield,
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
          color: '#d97706',
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
    <div className="max-w-5xl animate-fade-in">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span className="text-[11px] font-semibold text-brand uppercase tracking-widest">Billing</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Billing</h1>
        <p className="text-dark-400 text-[15px]">Manage your plan and usage</p>
      </div>

      {/* Current Plan Card */}
      <div className="glass-card mb-8 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
              <CreditCard className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-lg">Current Plan</h2>
              <p className="text-sm text-dark-400 capitalize">{currentPlan} Plan</p>
            </div>
          </div>
          <span className="badge badge-brand capitalize text-sm px-3 py-1.5">
            {currentPlan}
          </span>
        </div>
        {!loading && usage && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Queries this month</span>
              <span className="text-white font-medium">
                {currentPlan === 'free' ? `${usage.queries_count || 0} / ${usage.queries_limit || 25}` : 'Unlimited'}
              </span>
            </div>
            {currentPlan === 'free' && (
              <div className="progress-premium">
                <div
                  className={`progress-premium-fill ${usagePercent > 80 ? '!bg-gradient-to-r !from-danger !to-danger-light' : ''}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Plans</h2>
        <p className="text-sm text-dark-500">Choose the plan that fits your needs</p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan, index) => {
          const isCurrent = plan.key === currentPlan
          const PlanIcon = plan.icon
          return (
            <div
              key={plan.key}
              className={`relative animate-slide-up flex flex-col overflow-hidden transition-all duration-300 ${
                plan.highlight
                  ? 'gradient-border-card'
                  : 'glass-card'
              } ${plan.highlight ? 'scale-[1.02] z-10' : 'hover:scale-[1.01]'}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.highlight && (
                <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent" />
              )}

              {plan.highlight && (
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand text-white px-2.5 py-1 rounded-full">
                    Popular
                  </span>
                </div>
              )}

              <div className="mb-5 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  plan.highlight ? 'bg-brand/15 border border-brand/25' : 'bg-dark-800/60 border border-dark-700/40'
                }`}>
                  <PlanIcon className={`w-5 h-5 ${plan.highlight ? 'text-brand' : 'text-dark-400'}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-3xl font-bold text-white">
                  {plan.price}
                  <span className="text-sm text-dark-500 font-normal">{plan.period}</span>
                </p>
              </div>

              <ul className="space-y-2.5 mb-7 flex-grow relative z-10">
                {plan.features.map((f, i) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-sm text-dark-300 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1 + (i + 1) * 0.05}s` }}
                  >
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-brand' : 'text-dark-600'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || upgrading !== null}
                onClick={() => handleUpgrade(plan.key)}
                className={`w-full mt-auto py-3 rounded-xl font-medium transition-all duration-200 relative z-10 ${
                  isCurrent
                    ? 'bg-dark-800/60 text-dark-500 cursor-not-allowed'
                    : plan.highlight
                    ? 'bg-brand text-white hover:bg-brand-dark shadow-glow-brand'
                    : 'border border-dark-700/60 text-dark-200 hover:bg-dark-800/60 hover:border-dark-600'
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
                  <span className="flex items-center justify-center gap-1.5">
                    {plan.cta} <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
