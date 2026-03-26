// frontend/src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Github, FileText, MessageSquare, Code2, Zap, Shield, Users, Sparkles, Brain, Database, Search, Check, ChevronRight, Globe } from 'lucide-react';

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [threshold]);

  return { ref, isInView };
}

function WorkflowAnimation() {
  const [activeStep, setActiveStep] = useState(0);
  const { ref, isInView } = useInView(0.3);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, [isInView]);

  const steps = [
    {
      icon: Globe,
      title: 'Connect',
      desc: 'Link your GitHub, Notion, Slack, and VS Code in seconds with OAuth.',
      visual: (
        <div className="flex items-center justify-center gap-3">
          {[Github, FileText, MessageSquare, Code2].map((Icon, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
                activeStep === 0
                  ? 'bg-brand/20 border border-brand/40 scale-110'
                  : 'bg-dark-800 border border-dark-700'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <Icon className={`w-6 h-6 transition-colors duration-500 ${activeStep === 0 ? 'text-brand' : 'text-dark-500'}`} />
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Database,
      title: 'Sync',
      desc: 'We pull commits, pages, messages, and files into a unified context store.',
      visual: (
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-8 rounded transition-all duration-700 ${
                activeStep === 1 ? 'bg-brand/30 w-8' : 'bg-dark-800 w-4'
              }`}
              style={{ transitionDelay: `${i * 120}ms`, height: activeStep === 1 ? `${20 + i * 8}px` : '16px' }}
            />
          ))}
        </div>
      ),
    },
    {
      icon: Brain,
      title: 'Index',
      desc: 'Semantic embeddings are generated so the AI understands meaning, not just keywords.',
      visual: (
        <div className="flex items-center justify-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 ${
            activeStep === 2 ? 'bg-brand/20 border border-brand/40 shadow-lg shadow-brand/20 rotate-0 scale-110' : 'bg-dark-800 border border-dark-700 -rotate-6 scale-100'
          }`}>
            <Brain className={`w-8 h-8 transition-colors duration-500 ${activeStep === 2 ? 'text-brand' : 'text-dark-500'}`} />
          </div>
        </div>
      ),
    },
    {
      icon: Search,
      title: 'Ask',
      desc: 'Ask anything. Get grounded answers with cited sources from your real project data.',
      visual: (
        <div className="flex flex-col items-center gap-2">
          <div className={`px-4 py-2 rounded-lg text-sm transition-all duration-500 ${
            activeStep === 3 ? 'bg-dark-800 text-white border border-dark-600' : 'bg-dark-900 text-dark-600 border border-dark-800'
          }`}>
            {activeStep === 3 ? '"Why did auth break last week?"' : '"Type a question..."'}
          </div>
          <div className={`text-xs transition-all duration-500 ${activeStep === 3 ? 'text-brand opacity-100' : 'text-dark-600 opacity-0'}`}>
            Searching 3 sources...
          </div>
        </div>
      ),
    },
  ];

  return (
    <div ref={ref}>
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className="flex items-center gap-2 group"
          >
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeStep === i
                ? 'bg-brand/10 text-brand border border-brand/30'
                : 'text-dark-500 hover:text-dark-300'
            }`}>
              <step.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{step.title}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-dark-700 hidden sm:block" />
            )}
          </button>
        ))}
      </div>

      {/* Active step content */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-10 backdrop-blur-sm min-h-[220px] flex flex-col items-center justify-center text-center">
          <div className="mb-6">
            {steps[activeStep].visual}
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            <span className="text-brand mr-2">{activeStep + 1}.</span>
            {steps[activeStep].title}
          </h3>
          <p className="text-dark-400 leading-relaxed max-w-md">
            {steps[activeStep].desc}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Nav */}
      <nav className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">ContextOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-dark-400 hover:text-white transition text-sm font-medium px-3 py-1.5">
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
      <section className="max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10 text-brand text-xs font-medium mb-8 tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered project intelligence
        </div>
        <h1 className="text-5xl md:text-[4.5rem] font-bold text-white leading-[1.1] mb-6 tracking-tight">
          One AI. All your<br />
          <span className="text-brand">project context.</span>
        </h1>
        <p className="text-base text-dark-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Connect GitHub, Notion, Slack, and VS Code into one intelligent context layer.
          Ask anything and get answers grounded in your real project data.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-dark transition inline-flex items-center gap-2"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="border border-dark-700 text-dark-200 px-6 py-3 rounded-lg font-medium hover:bg-dark-900 hover:border-dark-600 transition"
          >
            How it Works
          </Link>
        </div>

        {/* Trust bar */}
        <div className="flex items-center justify-center gap-8 mt-16 text-dark-500 text-xs font-medium tracking-wide uppercase">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> AES-256 Encrypted</span>
          <span className="text-dark-700">|</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Real-time Sync</span>
          <span className="text-dark-700">|</span>
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Team Ready</span>
        </div>
      </section>

      {/* How it Works — Animated Workflow */}
      <section id="how-it-works" className="py-24 border-t border-dark-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-brand text-sm font-medium tracking-wide uppercase mb-3">How it works</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">Four steps to full project context</h2>
          </div>
          <WorkflowAnimation />
        </div>
      </section>

      {/* Integrations */}
      <section className="py-24 border-t border-dark-800/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-brand text-sm font-medium tracking-wide uppercase mb-3">Integrations</p>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Connect the tools you already use</h2>
          <p className="text-dark-400 max-w-xl mx-auto mb-16">
            One-click OAuth connections. Your data syncs automatically and stays up to date with webhooks.
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: Github, label: 'GitHub', desc: 'Commits, PRs, issues' },
              { icon: FileText, label: 'Notion', desc: 'Pages & databases' },
              { icon: MessageSquare, label: 'Slack', desc: 'Threads & channels' },
              { icon: Code2, label: 'VS Code', desc: 'Files & diagnostics' },
            ].map((item) => (
              <div key={item.label} className="bg-dark-900/30 border border-dark-800 rounded-xl p-6 hover:border-dark-700 transition-all group">
                <item.icon className="w-8 h-8 text-dark-300 mx-auto mb-3 group-hover:text-brand transition-colors" />
                <h3 className="font-semibold text-white mb-1 text-sm">{item.label}</h3>
                <p className="text-xs text-dark-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-dark-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-brand text-sm font-medium tracking-wide uppercase mb-3">Features</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">Built for developers who ship</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Streaming AI Chat', desc: 'Real-time answers with cited sources from your actual project data.' },
              { icon: Shield, title: 'Encrypted & Secure', desc: 'OAuth tokens encrypted with AES-256-GCM. Your data stays yours.' },
              { icon: Users, title: 'Team Context', desc: 'Share context across your team. Everyone gets smarter answers.' },
              { icon: Code2, title: 'VS Code Extension', desc: 'Ask questions right in your editor with full workspace context.' },
              { icon: Github, title: 'Real-time Sync', desc: 'Webhooks keep your context fresh. Push a commit, context updates.' },
              { icon: Search, title: 'Smart Retrieval', desc: 'Semantic search across all sources. Finds what matters most.' },
            ].map((f) => (
              <div key={f.title} className="p-5 rounded-xl border border-transparent hover:border-dark-800 hover:bg-dark-900/30 transition-all group">
                <div className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-brand/10 transition-colors">
                  <f.icon className="w-5 h-5 text-dark-400 group-hover:text-brand transition-colors" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-dark-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 border-t border-dark-800/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-brand text-sm font-medium tracking-wide uppercase mb-3">Pricing</p>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Simple, transparent pricing</h2>
          <p className="text-dark-400 mb-16">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto items-start">
            {/* Free */}
            <div className="bg-dark-900/30 border border-dark-800 rounded-xl p-7 text-left">
              <h3 className="text-base font-semibold text-white mb-1">Free</h3>
              <p className="text-3xl font-bold text-white mb-0.5">₹0<span className="text-sm text-dark-500 font-normal">/mo</span></p>
              <p className="text-dark-500 text-xs mb-6">For individual developers</p>
              <ul className="text-sm text-dark-400 space-y-2.5 mb-6">
                {['50 queries/day', '3 integrations', '10K context chunks', 'Community support'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dark-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full text-center border border-dark-700 text-white py-2.5 rounded-lg hover:bg-dark-800 transition text-sm font-medium"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-dark-900/30 border-2 border-brand/50 rounded-xl p-7 text-left relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                Popular
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Pro</h3>
              <p className="text-3xl font-bold text-white mb-0.5">₹999<span className="text-sm text-dark-500 font-normal">/mo</span></p>
              <p className="text-dark-500 text-xs mb-6">For developers & small teams</p>
              <ul className="text-sm text-dark-400 space-y-2.5 mb-6">
                {['Unlimited queries', 'Unlimited integrations', '100K context chunks', 'Team shared context', 'Priority support'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full text-center bg-brand text-white py-2.5 rounded-lg hover:bg-brand-dark transition text-sm font-medium"
              >
                Upgrade to Pro
              </Link>
            </div>

            {/* Team */}
            <div className="bg-dark-900/30 border border-dark-800 rounded-xl p-7 text-left">
              <h3 className="text-base font-semibold text-white mb-1">Team</h3>
              <p className="text-3xl font-bold text-white mb-0.5">₹2,999<span className="text-sm text-dark-500 font-normal">/mo</span></p>
              <p className="text-dark-500 text-xs mb-6">For growing teams & orgs</p>
              <ul className="text-sm text-dark-400 space-y-2.5 mb-6">
                {['Everything in Pro', 'Unlimited members', 'Unlimited chunks', 'SSO & SAML', 'Dedicated support', 'Custom SLA'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dark-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full text-center border border-dark-700 text-white py-2.5 rounded-lg hover:bg-dark-800 transition text-sm font-medium"
              >
                Upgrade to Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-dark-800/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Ready to give your AI real context?</h2>
          <p className="text-dark-400 mb-8 max-w-md mx-auto">Join developers who are building smarter with ContextOS. Free to start, no credit card required.</p>
          <Link
            href="/register"
            className="bg-brand text-white px-8 py-3.5 rounded-lg font-medium hover:bg-brand-dark transition inline-flex items-center gap-2"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-brand to-brand-dark rounded-md flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-dark-500 text-xs">&copy; 2026 ContextOS</span>
            </div>
            <div className="flex gap-6 text-xs text-dark-500">
              <Link href="/privacy" className="hover:text-dark-300 transition">Privacy</Link>
              <Link href="/terms" className="hover:text-dark-300 transition">Terms</Link>
              <Link href="/refund" className="hover:text-dark-300 transition">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
