'use client'

import Link from 'next/link'
import Head from 'next/head'
import { ArrowRight, HelpCircle, Search } from 'lucide-react'
import { useState } from 'react'
import { generateStructuredData } from '@/lib/structured-data'

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'What is ContextOS?',
          a: 'ContextOS is an AI-powered project intelligence platform that connects your development tools (GitHub, Notion, Slack, VS Code) into one unified context layer. It allows you to ask questions and get answers grounded in your actual project data, making it easier to understand codebases, find information, and stay productive.',
        },
        {
          q: 'How is ContextOS different from ChatGPT?',
          a: 'While ChatGPT provides general knowledge, ContextOS is specifically trained on YOUR project data. It knows your codebase, documentation, team conversations, and project history. Every answer includes citations to the actual source (commit, Slack message, Notion page), so you can verify and dive deeper.',
        },
        {
          q: 'Do I need to install anything?',
          a: 'No installation required for the web app. Simply sign up and connect your tools via OAuth. For the VS Code extension, install it from the marketplace and paste your API key from Settings. The extension is optional but provides a better in-editor experience.',
        },
        {
          q: 'How long does setup take?',
          a: 'Most users are up and running in under 5 minutes. Sign up, connect one integration (GitHub is fastest), wait for the initial sync, and start asking questions. You can add more integrations later as needed.',
        },
      ],
    },
    {
      category: 'Pricing & Plans',
      questions: [
        {
          q: 'Is there a free plan?',
          a: 'Yes! Our Free plan includes 25 AI queries per day, up to 10K context chunks, and 2 integration connections. Perfect for solo developers exploring the platform. No credit card required to start.',
        },
        {
          q: 'What happens if I exceed my query limit?',
          a: 'On the Free plan, you\'ll need to wait until the next day (resets at midnight UTC) or upgrade to Pro for unlimited queries. Pro users never hit limits and get priority processing for faster responses.',
        },
        {
          q: 'Can I cancel anytime?',
          a: 'Absolutely. Cancel with one click from your billing settings. No long-term contracts, no cancellation fees. If you cancel a paid plan, you\'ll retain access until the end of your billing period.',
        },
        {
          q: 'Do you offer refunds?',
          a: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied for any reason, contact support and we\'ll process a full refund immediately.',
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit cards (Visa, Mastercard, Amex, Discover) and PayPal. Enterprise customers can pay via invoice with NET30 terms.',
        },
      ],
    },
    {
      category: 'Security & Privacy',
      questions: [
        {
          q: 'Is my data secure?',
          a: 'Yes. We use AES-256-GCM encryption for all data at rest and TLS 1.3 for data in transit. OAuth tokens are encrypted before storage and never exposed in logs. We\'re SOC 2 Type II certified and GDPR compliant.',
        },
        {
          q: 'Who can see my data?',
          a: 'Only you and your team members (if you\'re on a Team plan). We never train AI models on your data, never share it with third parties, and never use it for marketing. Your data is yours, period.',
        },
        {
          q: 'Where is my data stored?',
          a: 'Data is stored in secure, encrypted databases hosted on AWS in the US (us-east-1). Enterprise customers can request custom regions. We maintain regular backups and have a 99.9% uptime SLA.',
        },
        {
          q: 'Can I delete my data?',
          a: 'Yes. You can disconnect any integration to stop syncing, or delete your account entirely to remove all data. Deletions are permanent and complete within 30 days per GDPR requirements.',
        },
      ],
    },
    {
      category: 'Integrations',
      questions: [
        {
          q: 'Which integrations do you support?',
          a: 'Currently: GitHub (repos, commits, PRs, issues), Notion (pages, databases), Slack (messages, threads), Linear (issues, projects), Google Drive (docs, sheets), and VS Code (files, diagnostics). More coming soon!',
        },
        {
          q: 'How often does data sync?',
          a: 'Initial sync happens immediately after connection. After that, webhooks keep data real-time (commits, messages, edits sync within seconds). You can also force a manual re-sync anytime from the Integrations page.',
        },
        {
          q: 'What if I disconnect an integration?',
          a: 'Disconnecting stops future syncs and revokes our OAuth access. Existing data remains in your context store unless you explicitly delete it. You can reconnect anytime to resume syncing.',
        },
        {
          q: 'Can I connect multiple GitHub accounts?',
          a: 'Yes! Pro and Team plans support unlimited integration connections. Connect personal and work accounts, multiple Slack workspaces, or different Notion spaces.',
        },
      ],
    },
    {
      category: 'Features',
      questions: [
        {
          q: 'What can I ask the AI?',
          a: 'Anything about your project! Examples: "Why did auth break last week?", "Summarize the latest sprint", "Find all TODOs in the codebase", "What did Sarah say about the API redesign?". The AI searches your connected data and provides cited answers.',
        },
        {
          q: 'Does the VS Code extension work offline?',
          a: 'The extension requires an internet connection to query the AI and sync context. However, you can browse previously cached responses offline. Full offline mode is on our roadmap.',
        },
        {
          q: 'Can I share prompts with my team?',
          a: 'Yes! The Prompts Library lets you save reusable prompts as "personal" (just you) or "team" (shared with everyone). Great for onboarding templates, code review checklists, and common queries.',
        },
        {
          q: 'Do you support custom integrations?',
          a: 'Enterprise customers can request custom integrations. We\'ve built connectors for Jira, Confluence, GitLab, and internal tools. Contact sales to discuss your needs.',
        },
      ],
    },
  ]

  const allQuestions = faqs.flatMap(cat => 
    cat.questions.map(q => ({ ...q, category: cat.category }))
  )

  const filteredFAQs = searchQuery
    ? faqs.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          q =>
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(cat => cat.questions.length > 0)
    : faqs

  const faqSchemaData = generateStructuredData({
    type: 'FAQPage',
    data: {
      questions: allQuestions.map(q => ({
        question: q.q,
        answer: q.a,
      })),
    },
  })

  return (
    <>
      <Head>
        <title>FAQ - Frequently Asked Questions | ContextOS</title>
        <meta name="description" content="Get answers to common questions about ContextOS. Learn about pricing, security, integrations, features, and how to get started with AI-powered project intelligence." />
        <meta name="keywords" content="ContextOS FAQ, AI developer tools questions, pricing questions, security, integrations help, how to use ContextOS" />
        
        {/* Open Graph */}
        <meta property="og:title" content="ContextOS FAQ - All Your Questions Answered" />
        <meta property="og:description" content="Find answers about pricing, security, integrations, and features. Learn how ContextOS can help your team." />
        <meta property="og:url" content="https://contextos.com/faq" />
        
        {/* FAQ Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchemaData }} />
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
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-4 py-2 mb-6">
            <HelpCircle className="w-4 h-4 text-brand" />
            <span className="text-brand text-sm font-medium">Help Center</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-dark-400 max-w-2xl mx-auto mb-8">
            Find answers to common questions about ContextOS. Can't find what you're looking for? <Link href="/contact" className="text-brand hover:underline">Contact support</Link>.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-dark-900 border border-dark-800 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-brand transition"
            />
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          {filteredFAQs.map((category) => (
            <div key={category.category} className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-1 h-8 bg-brand rounded-full" />
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, i) => (
                  <details
                    key={i}
                    className="group bg-dark-900/40 border border-dark-800 rounded-xl overflow-hidden hover:border-dark-700 transition-all"
                  >
                    <summary className="cursor-pointer p-6 flex items-center justify-between">
                      <h3 className="text-white font-semibold pr-4">{faq.q}</h3>
                      <svg
                        className="w-5 h-5 text-dark-500 group-open:rotate-180 transition-transform shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-6 text-dark-400 leading-relaxed">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {filteredFAQs.length === 0 && (
            <div className="text-center py-20">
              <HelpCircle className="w-16 h-16 text-dark-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
              <p className="text-dark-500">Try a different search term or <Link href="/contact" className="text-brand hover:underline">contact support</Link>.</p>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="bg-gradient-to-r from-brand/10 to-purple-500/10 border border-brand/20 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Still have questions?</h2>
            <p className="text-dark-400 mb-8 max-w-xl mx-auto">
              Our support team is here to help. Get in touch and we'll respond within 24 hours.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-dark transition"
              >
                Contact Support <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-dark-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-dark-700 transition"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
