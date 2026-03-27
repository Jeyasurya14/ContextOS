// frontend/src/app/dashboard/billing/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { CreditCard, Check, Loader2, Zap, Crown, Shield, ArrowRight, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { billingApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

declare global {
  interface Window { Razorpay: new (o: Record<string, unknown>) => { open: () => void } }
}

const PLANS = [
  {
    key: 'free', name: 'Free', price: '₹0', period: '/month', icon: Zap,
    color: '#71717a', textColor: '#a1a1aa',
    features: ['25 queries / day', '3 integrations', '10K context chunks', 'Community support'],
    cta: 'Current Plan',
  },
  {
    key: 'pro', name: 'Pro', price: '₹999', period: '/month', icon: Crown,
    color: '#d97706', textColor: '#f59e0b',
    highlight: true,
    features: ['Unlimited queries', 'All integrations', '100K context chunks', 'Shared team context', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    key: 'team', name: 'Team', price: '₹2,999', period: '/month', icon: Shield,
    color: '#8b5cf6', textColor: '#a78bfa',
    features: ['Everything in Pro', 'Unlimited chunks', 'Unlimited members', 'SSO & SAML', 'Custom SLA', 'Dedicated support'],
    cta: 'Upgrade to Team',
  },
]

export default function BillingPage() {
  const { user, refreshUser } = useAuthStore()
  const { toast } = useToast()
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    billingApi.getUsage().then(r => setUsage(r.data)).catch(() => toast.error('Failed to load usage')).finally(() => setLoading(false))
  }, [])

  const currentPlan = user?.plan || 'free'

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'free' || planKey === currentPlan) return
    setUpgrading(planKey)
    try {
      const r = await billingApi.createOrder(planKey)
      const { order_id, amount, currency, key } = r.data
      if (!window.Razorpay) { toast.error('Payment gateway not loaded.'); setUpgrading(null); return }
      const rp = new window.Razorpay({
        key, amount, currency,
        name: 'ContextOS',
        description: `Upgrade to ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`,
        order_id,
        handler: async (res: any) => {
          try {
            await billingApi.verifyPayment({ razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature, plan: planKey })
            toast.success('Payment successful! Plan upgraded.')
            await refreshUser()
          } catch { toast.error('Payment verification failed.') }
        },
        prefill: { email: user?.email || '', name: user?.name || '' },
        theme: { color: '#d97706' },
        modal: { ondismiss: () => setUpgrading(null) },
      })
      rp.open()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to initiate payment')
      setUpgrading(null)
    }
  }

  const queriesUsed = usage?.queries_count ?? 0
  const queriesLimit = usage?.queries_limit ?? 25
  const pct = queriesLimit > 0 && queriesLimit !== -1 ? Math.min((queriesUsed / queriesLimit) * 100, 100) : 0

  return (
    <>
      <style>{`
        @keyframes blFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="max-w-5xl" style={{ animation: 'blFade 0.3s ease-out' }}>
        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}>
              <CreditCard className="w-3.5 h-3.5 text-brand" />
              <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">Billing</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
          <p className="text-dark-500 text-sm mt-1">Manage your subscription and usage</p>
        </div>

        {/* Current plan + usage row */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {/* Current plan */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
            <p className="text-[10px] text-dark-600 font-semibold uppercase tracking-widest mb-3">Current Plan</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
                {currentPlan === 'pro' ? <Crown className="w-5 h-5 text-brand" /> : currentPlan === 'team' ? <Shield className="w-5 h-5 text-brand" /> : <Zap className="w-5 h-5 text-brand" />}
              </div>
              <div>
                <p className="text-xl font-bold text-white capitalize">{currentPlan}</p>
                <p className="text-[11px] text-dark-600">{currentPlan === 'free' ? '₹0/month' : currentPlan === 'pro' ? '₹999/month' : '₹2,999/month'}</p>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', color: '#f59e0b' }}>
                Active
              </span>
            </div>
            {currentPlan === 'pro' || currentPlan === 'team' ? (
              <p className="text-[11px] text-dark-600">Your plan renews monthly. Contact support to cancel.</p>
            ) : (
              <button onClick={() => handleUpgrade('pro')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                <Sparkles className="w-4 h-4" /> Upgrade to Pro <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Usage */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(15,15,17,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
            <p className="text-[10px] text-dark-600 font-semibold uppercase tracking-widest mb-3">Usage This Period</p>
            {loading ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-8 bg-dark-800/40 rounded-xl animate-pulse" />)}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-dark-500">Queries</span>
                    <span className="text-white font-medium">{queriesUsed} / {queriesLimit === -1 ? '∞' : queriesLimit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-dark-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: queriesLimit === -1 ? '15%' : `${pct}%`,
                        background: pct > 80 ? '#ef4444' : 'linear-gradient(90deg, #d97706, #f59e0b)',
                      }} />
                  </div>
                  {pct > 80 && <p className="text-[10px] text-red-400 mt-1">Running low — consider upgrading</p>}
                </div>
                <div className="pt-2 border-t border-white/5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-dark-500">Context chunks</span>
                    <span className="text-dark-300">{usage?.total_chunks ?? '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan cards */}
        <p className="text-[10px] text-dark-600 font-semibold uppercase tracking-widest mb-4">Choose a Plan</p>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrent = plan.key === currentPlan
            const Icon = plan.icon
            return (
              <div key={plan.key}
                className="relative rounded-2xl flex flex-col overflow-hidden transition-all duration-200"
                style={{
                  background: plan.highlight ? 'rgba(20,16,10,0.95)' : 'rgba(15,15,17,0.85)',
                  border: plan.highlight ? `1px solid ${plan.color}35` : '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  animation: `blFade 0.35s ease-out ${i * 0.07}s both`,
                  boxShadow: plan.highlight ? `0 0 40px rgba(217,119,6,0.08)` : 'none',
                }}>
                {/* Top accent line */}
                {plan.highlight && (
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${plan.color}, transparent)` }} />
                )}

                {plan.highlight && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: plan.color, color: '#000' }}>
                    Popular
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${plan.color}12`, border: `1px solid ${plan.color}25` }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: plan.color }} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-0.5">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-[11px] text-dark-600">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[12px] text-dark-400">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${plan.color}15` }}>
                          <Check className="w-2.5 h-2.5" style={{ color: plan.color }} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={isCurrent || upgrading !== null}
                    onClick={() => handleUpgrade(plan.key)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                    style={isCurrent
                      ? { background: 'rgba(255,255,255,0.04)', color: '#3f3f46', border: '1px solid rgba(255,255,255,0.06)' }
                      : { background: plan.highlight ? `linear-gradient(135deg, ${plan.color}, #b45309)` : `${plan.color}12`, color: plan.textColor, border: `1px solid ${plan.color}25` }
                    }
                    onMouseEnter={e => { if (!isCurrent) (e.currentTarget.style.opacity = '0.85') }}
                    onMouseLeave={e => { (e.currentTarget.style.opacity = '1') }}
                  >
                    {upgrading === plan.key
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : isCurrent ? 'Current Plan' : <>{plan.cta} <ArrowRight className="w-3.5 h-3.5" /></>
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-dark-700 text-center mt-6">
          Prices are in INR. Payments processed securely via Razorpay. Cancel anytime.
        </p>
      </div>
    </>
  )
}
