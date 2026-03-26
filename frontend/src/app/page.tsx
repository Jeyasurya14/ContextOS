// frontend/src/app/page.tsx
'use client';

import Link from 'next/link';
import { ArrowRight, Github, FileText, MessageSquare, Code2, Zap, Shield, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Nav */}
      <nav className="border-b border-dark-700 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-dark-50">ContextOS</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-dark-300 hover:text-dark-100 transition text-sm">
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand-light text-sm font-medium mb-6">
          AI that actually knows your project
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-dark-50 leading-tight mb-6">
          One AI. All your<br />
          <span className="text-brand-light">project context.</span>
        </h1>
        <p className="text-lg text-dark-300 max-w-2xl mx-auto mb-10">
          ContextOS connects your GitHub, Notion, Slack, and VS Code into one intelligent context layer.
          Ask anything about your project and get answers grounded in real data.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-dark transition flex items-center gap-2"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#features"
            className="border border-dark-600 text-dark-200 px-6 py-3 rounded-lg font-medium hover:bg-dark-900 transition"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-dark-900 border-y border-dark-700 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-dark-50 mb-4">The Problem</h2>
          <p className="text-dark-300 max-w-2xl mx-auto text-lg">
            Your project knowledge is scattered across GitHub commits, Notion docs, Slack threads,
            and code files. AI assistants today have no idea about any of it.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-dark-50 mb-4">The Solution</h2>
          <p className="text-dark-300 max-w-2xl mx-auto text-lg mb-12">
            ContextOS syncs your tools, builds a unified context layer, and gives you an AI that
            actually understands your project — from code to conversations.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Github, label: 'GitHub', desc: 'Commits, PRs, issues with full diffs' },
              { icon: FileText, label: 'Notion', desc: 'Pages, databases, knowledge bases' },
              { icon: MessageSquare, label: 'Slack', desc: 'Channel history, threads, decisions' },
              { icon: Code2, label: 'VS Code', desc: 'Open files, diagnostics, git log' },
            ].map((item) => (
              <div key={item.label} className="bg-dark-900 border border-dark-700 rounded-xl p-6">
                <item.icon className="w-8 h-8 text-brand-light mx-auto mb-3" />
                <h3 className="font-semibold text-dark-50 mb-1">{item.label}</h3>
                <p className="text-sm text-dark-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-dark-900 border-y border-dark-700 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-dark-50 text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Streaming AI Chat', desc: 'Real-time answers with cited sources from your actual project data.' },
              { icon: Shield, title: 'Encrypted & Secure', desc: 'OAuth tokens encrypted with AES-256-GCM. Your data stays yours.' },
              { icon: Users, title: 'Team Context', desc: 'Share context across your team. Everyone gets smarter answers.' },
              { icon: Code2, title: 'VS Code Extension', desc: 'Ask questions right in your editor with full workspace context.' },
              { icon: Github, title: 'Real-time Sync', desc: 'Webhooks keep your context fresh. Push a commit, context updates.' },
              { icon: FileText, title: 'Smart Retrieval', desc: 'Semantic search across all sources. Finds what matters most.' },
            ].map((f) => (
              <div key={f.title} className="p-6">
                <f.icon className="w-6 h-6 text-brand-light mb-3" />
                <h3 className="font-semibold text-dark-50 mb-2">{f.title}</h3>
                <p className="text-sm text-dark-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-dark-50 mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-dark-900 border border-dark-700 rounded-xl p-8">
              <h3 className="text-lg font-semibold text-dark-50 mb-2">Free</h3>
              <p className="text-3xl font-bold text-dark-50 mb-1">₹0<span className="text-sm text-dark-400 font-normal">/month</span></p>
              <p className="text-dark-400 text-sm mb-6">For individual developers</p>
              <ul className="text-sm text-dark-300 space-y-2 text-left">
                <li>- 50 queries/day</li>
                <li>- 3 integrations</li>
                <li>- 10K context chunks</li>
                <li>- Community support</li>
              </ul>
              <Link
                href="/register"
                className="mt-6 block w-full text-center border border-dark-600 text-dark-200 py-2 rounded-lg hover:bg-dark-800 transition"
              >
                Get Started
              </Link>
            </div>
            <div className="bg-dark-900 border-2 border-brand rounded-xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-3 py-1 rounded-full">
                Recommended
              </div>
              <h3 className="text-lg font-semibold text-dark-50 mb-2">Pro</h3>
              <p className="text-3xl font-bold text-dark-50 mb-1">₹999<span className="text-sm text-dark-400 font-normal">/month</span></p>
              <p className="text-dark-400 text-sm mb-6">For developers and small teams</p>
              <ul className="text-sm text-dark-300 space-y-2 text-left">
                <li>- Unlimited queries/day</li>
                <li>- Unlimited integrations</li>
                <li>- 100K context chunks</li>
                <li>- Team shared context</li>
                <li>- Priority support</li>
              </ul>
              <Link
                href="/register"
                className="mt-6 block w-full text-center bg-brand text-white py-2 rounded-lg hover:bg-brand-dark transition"
              >
                Upgrade to Pro
              </Link>
            </div>
            <div className="bg-dark-900 border border-dark-700 rounded-xl p-8">
              <h3 className="text-lg font-semibold text-dark-50 mb-2">Team</h3>
              <p className="text-3xl font-bold text-dark-50 mb-1">₹2,999<span className="text-sm text-dark-400 font-normal">/month</span></p>
              <p className="text-dark-400 text-sm mb-6">For growing teams and orgs</p>
              <ul className="text-sm text-dark-300 space-y-2 text-left">
                <li>- Unlimited queries/day</li>
                <li>- Unlimited integrations</li>
                <li>- Unlimited context chunks</li>
                <li>- Unlimited team members</li>
                <li>- SSO & SAML</li>
                <li>- Dedicated support</li>
                <li>- Custom SLA</li>
              </ul>
              <Link
                href="/register"
                className="mt-6 block w-full text-center border border-dark-600 text-dark-200 py-2 rounded-lg hover:bg-dark-800 transition"
              >
                Upgrade to Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-700 py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-dark-400 text-sm">&copy; 2026 ContextOS. All rights reserved.</span>
          <div className="flex gap-6 text-sm text-dark-400">
            <Link href="/privacy" className="hover:text-dark-200 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-dark-200 transition">Terms</Link>
            <Link href="/refund" className="hover:text-dark-200 transition">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
