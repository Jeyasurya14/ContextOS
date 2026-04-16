'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { CreditCard, Check, Zap, Crown, Shield, ArrowRight, History, PieChart, Activity, Cpu } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { billingApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

declare global {
  interface Window { Razorpay: new (o: Record<string, unknown>) => { open: () => void } }
}

const PLANS = [
  {
    key: 'free', name: 'Starter', price: '₹0', period: '/mo', icon: Zap,
    color: 'var(--text-tertiary)',
    desc: 'For individual developers testing context.',
    features: ['25 queries / day', '3 integrations', '10K context chunks', 'Shared team context'],
    cta: 'Current Plan',
  },
  {
    key: 'pro', name: 'Professional', price: '₹999', period: '/mo', icon: Crown,
    color: 'var(--brand)',
    highlight: true,
    desc: 'For power users scale query throughput.',
    features: ['Unlimited queries', 'All integrations', '100K context chunks', 'Priority Inference', 'Advanced analytics'],
    cta: 'Upgrade to Pro',
  },
  {
    key: 'team', name: 'Enterprise', price: '₹2,999', period: '/mo', icon: Shield,
    color: '#8b5cf6',
    desc: 'For organizations with massive scale.',
    features: ['Everything in Pro', 'Unlimited chunks', 'Unlimited members', 'Private model hosting', 'Custom dedicated support'],
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
        theme: { color: '#f59e0b' },
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
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      {/* ── Subscriptions ── */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Subscription Model</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const isCurrent = currentPlan.toLowerCase() === plan.key.toLowerCase()

            return (
              <div key={plan.key} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: isCurrent ? 'var(--bg-subtle)' : 'var(--bg-base)', border: plan.highlight ? '1px solid var(--brand-border)' : '1px solid var(--border-subtle)' }}>
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <plan.icon size={16} style={{ color: plan.color }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.name}</span>
                       {isCurrent && <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: 10 }}>Current</span>}
                   </div>
                   <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{plan.desc}</p>
                </div>

                <div style={{ padding: 24, flex: 1 }}>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{plan.price}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{plan.period}</span>
                   </div>
                   
                   <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', margin: 0, padding: 0 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                           <Check size={14} style={{ color: 'var(--success-text)', flexShrink: 0, marginTop: 2 }} />
                           {f}
                        </li>
                      ))}
                   </ul>
                </div>

                <div style={{ padding: '0 24px 24px' }}>
                   <button 
                     className={`btn ${isCurrent ? 'btn-secondary' : plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                     style={{ width: '100%', height: 38, fontSize: 13, fontWeight: 600 }}
                     onClick={() => handleUpgrade(plan.key)}
                     disabled={isCurrent || upgrading === plan.key}
                   >
                     {upgrading === plan.key ? <Loader2 size={14} className="anim-spin" /> : null}
                     {upgrading === plan.key ? 'Authorizing...' : isCurrent ? 'Active Subscription' : plan.cta}
                   </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Resource Allocation ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }}>
        
        <div className="card" style={{ padding: '24px 32px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
             <Cpu size={14} style={{ color: 'var(--brand)' }} />
             <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Operational Quotas</h3>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Knowledge Queries</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{queriesUsed} / {queriesLimit === -1 ? '∞' : queriesLimit}</span>
                 </div>
                 <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--danger)' : 'var(--brand)', transition: 'width 0.4s ease' }} />
                 </div>
              </div>

              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Integration Slots</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Active</span>
                 </div>
                 <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '40%', background: 'var(--success)', transition: 'width 0.4s ease' }} />
                 </div>
              </div>
           </div>
        </div>

        <div className="card" style={{ padding: '24px 32px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
             <History size={14} style={{ color: 'var(--text-tertiary)' }} />
             <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invoices</h3>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>No recent invoices</span>
                 <span style={{ color: 'var(--text-disabled)' }}>—</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                 Invoices are generated upon successful payment. Check your email for PDF receipts.
              </p>
           </div>
        </div>

      </div>

    </div>
  )
}

function Loader2({ size, className }: { size: number, className?: string }) {
  return <Zap size={size} className={className} />
}
