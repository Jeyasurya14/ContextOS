'use client'

import { useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { Check, X, ArrowRight, Zap, Users, Building2, Shield, Sparkles } from 'lucide-react'
import { generateStructuredData } from '@/lib/structured-data'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, annual: 0 },
      description: 'Perfect for solo developers exploring AI-powered context',
      features: [
        '25 AI queries per day',
        'Up to 10K context chunks',
        '2 integration connections',
        'Basic chat interface',
        'VS Code extension',
        'Email support',
      ],
      limitations: [
        'No team sharing',
        'No webhooks',
        'No priority support',
      ],
      cta: 'Start Free',
      href: '/register',
      popular: false,
      icon: Sparkles,
    },
    {
      name: 'Pro',
      price: { monthly: 19, annual: 15 },
      description: 'For professional developers who need unlimited AI power',
      features: [
        'Unlimited AI queries',
        'Up to 100K context chunks',
        'Unlimited integrations',
        'Advanced chat with history',
        'VS Code extension',
        'Real-time webhooks',
        'Priority email support',
        'Custom prompts library',
      ],
      limitations: [],
      cta: 'Start Pro Trial',
      href: '/register?plan=pro',
      popular: true,
      icon: Zap,
    },
    {
      name: 'Team',
      price: { monthly: 49, annual: 39 },
      description: 'For teams building together with shared context',
      features: [
        'Everything in Pro',
        'Unlimited team members',
        'Shared context across team',
        'Team analytics dashboard',
        'Admin controls',
        'SSO (coming soon)',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
      ],
      limitations: [],
      cta: 'Start Team Trial',
      href: '/register?plan=team',
      popular: false,
      icon: Users,
    },
    {
      name: 'Enterprise',
      price: { monthly: 'Custom', annual: 'Custom' },
      description: 'For organizations with advanced security and compliance needs',
      features: [
        'Everything in Team',
        'Custom deployment options',
        'Advanced security controls',
        'SOC 2 Type II compliance',
        'Custom SLA',
        'Dedicated account manager',
        'Custom integrations',
        'Training & onboarding',
        'Volume discounts',
      ],
      limitations: [],
      cta: 'Contact Sales',
      href: '/contact',
      popular: false,
      icon: Building2,
    },
  ]

  const productData = generateStructuredData({
    type: 'Product',
    data: {
      name: 'ContextOS Pro',
      description: 'Professional AI-powered project intelligence platform',
      price: billingCycle === 'monthly' ? '19' : '15',
    },
  })

  return (
    <>
      <Head>
        <title>Pricing Plans | ContextOS - Free to Enterprise</title>
        <meta name="description" content="Choose the perfect ContextOS plan for your needs. Start free with 25 AI queries/day, upgrade to Pro for unlimited access, or go Team for collaboration. No credit card required." />
        <meta name="keywords" content="ContextOS pricing, AI developer tools pricing, GitHub integration cost, Notion AI pricing, developer tools subscription" />
        
        {/* Open Graph */}
        <meta property="og:title" content="ContextOS Pricing - Free to Enterprise Plans" />
        <meta property="og:description" content="Start free with 25 AI queries/day. Upgrade to Pro for unlimited access at $19/mo. Team plans from $49/mo." />
        <meta property="og:url" content="https://contextos.com/pricing" />
        
        {/* Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productData }} />
      </Head>

      <div className="min-h-screen bg-dark-950">
        {/* Nav */}
        <nav className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg" style={{ background: 'linear-gradient(135deg, #6450ff, #9f37ff)' }} />
              <span className="text-lg font-bold text-white">ContextOS</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-dark-400 hover:text-white transition text-sm font-medium px-3 py-1.5">
                Log in
              </Link>
              <Link href="/register" className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition">
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Header */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-dark-400 max-w-2xl mx-auto mb-8">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-dark-900 border border-dark-800 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-brand text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-brand text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Annual
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon
              const price = typeof plan.price[billingCycle] === 'number' 
                ? plan.price[billingCycle] 
                : plan.price[billingCycle]

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-8 ${
                    plan.popular
                      ? 'bg-brand/5 border-2 border-brand/30 shadow-lg shadow-brand/10'
                      : 'bg-dark-900/40 border border-dark-800'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-bold px-4 py-1.5 rounded-full">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.popular ? 'bg-brand/20' : 'bg-dark-800'
                    }`}>
                      <Icon className={`w-5 h-5 ${plan.popular ? 'text-brand' : 'text-dark-400'}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  </div>

                  <p className="text-sm text-dark-400 mb-6">{plan.description}</p>

                  <div className="mb-6">
                    {typeof price === 'number' ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-white">${price}</span>
                          <span className="text-dark-500">/month</span>
                        </div>
                        {billingCycle === 'annual' && price > 0 && (
                          <p className="text-xs text-dark-500 mt-1">
                            Billed ${price * 12}/year
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-4xl font-bold text-white">{price}</div>
                    )}
                  </div>

                  <Link
                    href={plan.href}
                    className={`block w-full text-center py-3 rounded-lg font-medium transition mb-6 ${
                      plan.popular
                        ? 'bg-brand text-white hover:bg-brand-dark'
                        : 'bg-dark-800 text-white hover:bg-dark-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-dark-300">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation) => (
                      <div key={limitation} className="flex items-start gap-3">
                        <X className="w-5 h-5 text-dark-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-dark-500">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Trust Signals */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <Shield className="w-8 h-8 text-brand mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">30-Day Money-Back Guarantee</h4>
              <p className="text-sm text-dark-400">Not satisfied? Get a full refund, no questions asked.</p>
            </div>
            <div>
              <Check className="w-8 h-8 text-brand mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">No Credit Card Required</h4>
              <p className="text-sm text-dark-400">Start free and upgrade when you're ready.</p>
            </div>
            <div>
              <Zap className="w-8 h-8 text-brand mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">Cancel Anytime</h4>
              <p className="text-sm text-dark-400">No long-term contracts. Cancel with one click.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans later?',
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, Amex) and PayPal. Enterprise customers can pay via invoice.',
              },
              {
                q: 'Is my data secure?',
                a: "Absolutely. We use AES-256-GCM encryption for all data at rest and TLS 1.3 for data in transit. We're SOC 2 Type II certified.",
              },
              {
                q: 'Do you offer refunds?',
                a: "Yes, we offer a 30-day money-back guarantee on all paid plans. Just contact support and we'll process your refund immediately.",
              },
              {
                q: 'Can I try Pro before buying?',
                a: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.',
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-dark-900/40 border border-dark-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
          <div className="bg-gradient-to-r from-brand/10 to-purple-500/10 border border-brand/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-dark-400 mb-8 max-w-xl mx-auto">
              Join thousands of developers building smarter with ContextOS. Start free, no credit card required.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-brand text-white px-8 py-3.5 rounded-lg font-medium hover:bg-brand-dark transition"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
