// frontend/src/app/page.tsx
'use client';

import Link from 'next/link';
import { ArrowRight, Github, FileText, MessageSquare, Code2, Zap, Shield, Users, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-brand/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none"></div>

      {/* Nav */}
      <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ContextOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-dark-300 hover:text-white transition text-sm font-medium">
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-dark transition shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand-light text-sm font-medium mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          AI that actually knows your project
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 animate-slide-up">
          One AI. All your<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-brand">project context.</span>
        </h1>
        <p className="text-lg text-dark-300 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          ContextOS connects your GitHub, Notion, Slack, and VS Code into one intelligent context layer.
          Ask anything about your project and get answers grounded in real data.
        </p>
        <div className="flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link
            href="/register"
            className="bg-brand text-white px-8 py-4 rounded-lg font-semibold hover:bg-brand-dark transition flex items-center gap-2 shadow-xl shadow-brand/20 hover:shadow-2xl hover:shadow-brand/30 hover:scale-105 active:scale-95"
          >
            Start Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="#features"
            className="border-2 border-dark-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-dark-900 hover:border-dark-600 transition"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-dark-900/50 border-y border-dark-800 py-20 relative backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">The Problem</h2>
          <p className="text-dark-300 max-w-2xl mx-auto text-lg leading-relaxed">
            Your project knowledge is scattered across GitHub commits, Notion docs, Slack threads,
            and code files. AI assistants today have no idea about any of it.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">The Solution</h2>
          <p className="text-dark-300 max-w-2xl mx-auto text-lg mb-16 leading-relaxed">
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
              <div key={item.label} className="bg-dark-900/50 border border-dark-800 rounded-xl p-6 hover:border-brand/50 transition-all hover:shadow-lg hover:shadow-brand/10 backdrop-blur-sm group">
                <item.icon className="w-10 h-10 text-brand mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-white mb-2">{item.label}</h3>
                <p className="text-sm text-dark-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-dark-900/50 border-y border-dark-800 py-20 relative backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Streaming AI Chat', desc: 'Real-time answers with cited sources from your actual project data.' },
              { icon: Shield, title: 'Encrypted & Secure', desc: 'OAuth tokens encrypted with AES-256-GCM. Your data stays yours.' },
              { icon: Users, title: 'Team Context', desc: 'Share context across your team. Everyone gets smarter answers.' },
              { icon: Code2, title: 'VS Code Extension', desc: 'Ask questions right in your editor with full workspace context.' },
              { icon: Github, title: 'Real-time Sync', desc: 'Webhooks keep your context fresh. Push a commit, context updates.' },
              { icon: FileText, title: 'Smart Retrieval', desc: 'Semantic search across all sources. Finds what matters most.' },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-xl hover:bg-dark-900/80 transition-all group">
                <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                  <f.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">{f.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Simple Pricing</h2>
          <p className="text-dark-400 mb-16">Choose the plan that fits your needs</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-8 backdrop-blur-sm hover:border-dark-700 transition-all">
              <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
              <p className="text-4xl font-bold text-white mb-1">₹0<span className="text-sm text-dark-400 font-normal">/month</span></p>
              <p className="text-dark-400 text-sm mb-8">For individual developers</p>
              <ul className="text-sm text-dark-300 space-y-3 text-left mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  50 queries/day
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  3 integrations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  10K context chunks
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Community support
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full text-center border-2 border-dark-700 text-white py-3 rounded-lg hover:bg-dark-800 hover:border-dark-600 transition font-medium"
              >
                Get Started
              </Link>
            </div>
            <div className="bg-dark-900/50 border-2 border-brand rounded-xl p-8 relative backdrop-blur-sm shadow-xl shadow-brand/10 scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand to-brand-dark text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                Recommended
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
              <p className="text-4xl font-bold text-white mb-1">₹999<span className="text-sm text-dark-400 font-normal">/month</span></p>
              <p className="text-dark-400 text-sm mb-8">For developers and small teams</p>
              <ul className="text-sm text-dark-300 space-y-3 text-left mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Unlimited queries/day
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Unlimited integrations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  100K context chunks
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Team shared context
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Priority support
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full text-center bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition font-semibold shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30"
              >
                Upgrade to Pro
              </Link>
            </div>
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-8 backdrop-blur-sm hover:border-dark-700 transition-all">
              <h3 className="text-xl font-semibold text-white mb-2">Team</h3>
              <p className="text-4xl font-bold text-white mb-1">₹2,999<span className="text-sm text-dark-400 font-normal">/month</span></p>
              <p className="text-dark-400 text-sm mb-8">For growing teams and orgs</p>
              <ul className="text-sm text-dark-300 space-y-3 text-left mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Unlimited queries/day
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Unlimited integrations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Unlimited context chunks
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Unlimited team members
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  SSO & SAML
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Dedicated support
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                  Custom SLA
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full text-center border-2 border-dark-700 text-white py-3 rounded-lg hover:bg-dark-800 hover:border-dark-600 transition font-medium"
              >
                Upgrade to Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-12 relative bg-dark-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-dark-400 text-sm">&copy; 2026 ContextOS. All rights reserved.</span>
            </div>
            <div className="flex gap-8 text-sm text-dark-400">
              <Link href="/privacy" className="hover:text-white transition font-medium">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition font-medium">Terms</Link>
              <Link href="/refund" className="hover:text-white transition font-medium">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
