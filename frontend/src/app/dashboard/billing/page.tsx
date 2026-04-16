'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { CreditCard, Check, Zap, Crown, Shield, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { billingApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

declare global {
  interface Window { Razorpay: new (o: Record<string, unknown>) => { open: () => void } }
}

const PLANS = [
  {
    key: 'free', name: 'Free', price: '₹0', period: '/month', icon: Zap,
    color: 'var(--text-tertiary)',
    features: ['25 queries / day', '3 integrations', '10K context chunks', 'Community support'],
    cta: 'Current Plan',
  },
  {
    key: 'pro', name: 'Pro', price: '₹999', period: '/month', icon: Crown,
    color: 'var(--brand)',
    highlight: true,
    features: ['Unlimited queries', 'All integrations', '100K context chunks', 'Shared team context', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    key: 'team', name: 'Team', price: '₹2,999', period: '/month', icon: Shield,
    color: '#8b5cf6',
    features: ['Everything in Pro', 'Unlimited chunks', 'Unlimited members', 'SSO & SAML', 'Custom SLA'],
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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="anim-fade-up max-w-[1000px]">
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Billing & Usage
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            Manage your subscription plan and monitor workspace usage limits.
          </p>
        </div>

        {/* Usage Card */}
        <div className="card" style={{ padding: 24, marginBottom: 32, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Current Usage</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Queries Today</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {queriesUsed} / {queriesLimit === -1 ? 'Unlimited' : queriesLimit}
              </span>
            </div>
            {/* Progress bar */}
            {queriesLimit !== -1 && (
              <div style={{ width: '100%', height: 6, borderRadius: 'var(--r-full)', background: 'var(--bg-overlay)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: pct > 85 ? 'var(--danger)' : 'var(--brand)', width: `${pct}%`, transition: 'width var(--t-normal)' }} />
              </div>
            )}
            {queriesLimit !== -1 && pct > 85 && (
              <p style={{ fontSize: 12, color: 'var(--danger-text)', marginTop: 8 }}>You are approaching your daily query limit.</p>
            )}
          </div>
          
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Current Plan</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{currentPlan}</span>
                  <span className="badge badge-green">Active</span>
                </div>
              </div>
              <CreditCard style={{ width: 24, height: 24, color: 'var(--text-tertiary)' }} />
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Available Plans</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const isCurrent = currentPlan.toLowerCase() === plan.key.toLowerCase()

            return (
              <div key={plan.key} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', border: plan.highlight ? '1px solid var(--brand-border)' : '1px solid var(--border-subtle)' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--brand)' }} />
                )}
                
                <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <plan.icon style={{ width: 20, height: 20, color: plan.color }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', paddingBottom: 4 }}>{plan.period}</span>
                  </div>
                </div>

                <div style={{ padding: 24, flex: 1 }}>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', margin: 0, padding: 0 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--text-secondary)' }}>
                        <Check style={{ width: 14, height: 14, color: 'var(--success-text)', flexShrink: 0, marginTop: 2 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ padding: '0 24px 24px' }}>
                  <button
                    className={`btn ${isCurrent ? 'btn-secondary' : plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', height: 40 }}
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={isCurrent || upgrading === plan.key}
                  >
                    {upgrading === plan.key ? 'Processing...' : isCurrent ? 'Current Plan' : plan.cta}
                    {!isCurrent && upgrading !== plan.key && <ArrowRight style={{ width: 14, height: 14, marginLeft: 6 }} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
