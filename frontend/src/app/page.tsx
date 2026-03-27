// frontend/src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
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
  const { ref, isInView } = useInView(0.15);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, [isInView]);

  const sources = [
    { icon: Github, label: 'GitHub' },
    { icon: FileText, label: 'Notion' },
    { icon: MessageSquare, label: 'Slack' },
    { icon: Code2, label: 'VS Code' },
  ];

  const steps = [
    { icon: Globe, title: 'Connect', desc: 'OAuth into your tools in one click. We handle the rest.' },
    { icon: Database, title: 'Sync', desc: 'Data flows from all sources into a unified context store.' },
    { icon: Brain, title: 'Index', desc: 'Semantic embeddings let the AI understand meaning, not just keywords.' },
    { icon: Search, title: 'Ask', desc: 'Ask anything and get cited, grounded answers from real data.' },
  ];

  return (
    <div ref={ref}>
      {/* Wireframe diagram */}
      <div className="relative border border-dark-800 rounded-2xl bg-dark-900/30 p-6 md:p-10 overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Main flow: Sources → Context Engine → AI Output */}
        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-0 justify-between">

          {/* Column 1: Sources */}
          <div className="flex flex-col gap-3 md:w-[160px] shrink-0">
            <div className="text-[10px] font-semibold text-dark-500 uppercase tracking-widest mb-1 text-center">Sources</div>
            {sources.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-500 ${
                  activeStep >= 0
                    ? 'border-dark-700 bg-dark-800/50'
                    : 'border-dark-800 bg-transparent'
                } ${activeStep === 0 ? 'border-brand/40 bg-brand/5' : ''}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <s.icon className={`w-4 h-4 transition-colors duration-500 ${activeStep === 0 ? 'text-brand' : 'text-dark-400'}`} />
                <span className={`text-xs font-medium transition-colors duration-500 ${activeStep === 0 ? 'text-white' : 'text-dark-400'}`}>{s.label}</span>
                <div className={`ml-auto w-1.5 h-1.5 rounded-full transition-all duration-500 ${activeStep === 0 ? 'bg-brand shadow-sm shadow-brand/50' : 'bg-dark-600'}`} />
              </div>
            ))}
          </div>

          {/* Connector 1 */}
          <div className="hidden md:flex items-center flex-1 max-w-[100px] relative">
            <div className="w-full h-px bg-dark-700 relative">
              <div
                className={`absolute inset-y-0 left-0 h-px bg-brand transition-all duration-700 ease-out ${activeStep >= 1 ? 'w-full' : 'w-0'}`}
              />
              {/* Animated dots */}
              {activeStep === 1 && (
                <>
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand shadow-md shadow-brand/50 animate-[flowRight_1.5s_ease-in-out_infinite]" />
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand/50 shadow-md shadow-brand/30 animate-[flowRight_1.5s_ease-in-out_infinite_0.4s]" />
                </>
              )}
            </div>
            <ArrowRight className={`w-3.5 h-3.5 -ml-1 transition-colors duration-500 ${activeStep >= 1 ? 'text-brand' : 'text-dark-700'}`} />
          </div>
          {/* Mobile connector */}
          <div className="md:hidden flex flex-col items-center">
            <div className={`w-px h-8 transition-colors duration-500 ${activeStep >= 1 ? 'bg-brand' : 'bg-dark-700'}`} />
            <ArrowRight className={`w-3.5 h-3.5 rotate-90 transition-colors duration-500 ${activeStep >= 1 ? 'text-brand' : 'text-dark-700'}`} />
          </div>

          {/* Column 2: Context Engine */}
          <div className="md:w-[200px] shrink-0">
            <div className="text-[10px] font-semibold text-dark-500 uppercase tracking-widest mb-2 text-center">Context Engine</div>
            <div className={`relative rounded-xl border-2 border-dashed p-5 transition-all duration-700 ${
              activeStep === 1 ? 'border-brand/50 bg-brand/5' : activeStep === 2 ? 'border-brand/40 bg-brand/5' : 'border-dark-700 bg-dark-900/50'
            }`}>
              {/* Pulse ring */}
              <div className={`absolute inset-0 rounded-xl transition-opacity duration-700 ${activeStep === 2 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 rounded-xl border border-brand/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>

              <div className="relative flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  activeStep === 2 ? 'bg-brand/20 shadow-lg shadow-brand/20' : activeStep === 1 ? 'bg-brand/10' : 'bg-dark-800'
                }`}>
                  <Brain className={`w-6 h-6 transition-all duration-500 ${activeStep === 2 ? 'text-brand scale-110' : activeStep === 1 ? 'text-brand/60' : 'text-dark-500'}`} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-semibold transition-colors duration-500 ${activeStep >= 1 && activeStep <= 2 ? 'text-white' : 'text-dark-400'}`}>
                    Unified Store
                  </p>
                  <p className="text-[10px] text-dark-500 mt-0.5">Semantic Indexing</p>
                </div>

                {/* Mini data indicators */}
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-6 h-1 rounded-full transition-all duration-500 ${
                        activeStep >= 1 ? 'bg-brand/30' : 'bg-dark-700'
                      } ${activeStep === 2 && i <= activeStep ? 'bg-brand/60' : ''}`}
                      style={{ transitionDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Connector 2 */}
          <div className="hidden md:flex items-center flex-1 max-w-[100px] relative">
            <div className="w-full h-px bg-dark-700 relative">
              <div
                className={`absolute inset-y-0 left-0 h-px bg-brand transition-all duration-700 ease-out ${activeStep >= 3 ? 'w-full' : 'w-0'}`}
              />
              {activeStep === 3 && (
                <>
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand shadow-md shadow-brand/50 animate-[flowRight_1.5s_ease-in-out_infinite]" />
                </>
              )}
            </div>
            <ArrowRight className={`w-3.5 h-3.5 -ml-1 transition-colors duration-500 ${activeStep >= 3 ? 'text-brand' : 'text-dark-700'}`} />
          </div>
          {/* Mobile connector */}
          <div className="md:hidden flex flex-col items-center">
            <div className={`w-px h-8 transition-colors duration-500 ${activeStep >= 3 ? 'bg-brand' : 'bg-dark-700'}`} />
            <ArrowRight className={`w-3.5 h-3.5 rotate-90 transition-colors duration-500 ${activeStep >= 3 ? 'text-brand' : 'text-dark-700'}`} />
          </div>

          {/* Column 3: AI Output */}
          <div className="md:w-[220px] shrink-0">
            <div className="text-[10px] font-semibold text-dark-500 uppercase tracking-widest mb-2 text-center">AI Output</div>
            <div className={`rounded-xl border p-4 transition-all duration-700 ${
              activeStep === 3 ? 'border-brand/40 bg-dark-800/80 shadow-lg shadow-brand/5' : 'border-dark-800 bg-dark-900/50'
            }`}>
              {/* Mock chat UI */}
              <div className="space-y-2.5">
                <div className={`flex items-start gap-2 transition-opacity duration-500 ${activeStep === 3 ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="w-5 h-5 rounded-full bg-dark-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-3 h-3 text-dark-400" />
                  </div>
                  <div className={`text-[11px] rounded-lg px-2.5 py-1.5 transition-colors duration-500 ${
                    activeStep === 3 ? 'bg-dark-700 text-white' : 'bg-dark-800 text-dark-500'
                  }`}>
                    Why did auth break?
                  </div>
                </div>
                <div className={`flex items-start gap-2 transition-all duration-700 ${activeStep === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-brand" />
                  </div>
                  <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-brand/10 text-dark-200 border border-brand/20">
                    Based on <span className="text-brand font-medium">commit #a3f2</span> and <span className="text-brand font-medium">Slack thread</span>, the JWT secret was rotated without updating the env...
                  </div>
                </div>
                {/* Source chips */}
                <div className={`flex gap-1.5 ml-7 transition-all duration-700 delay-200 ${activeStep === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
                  {['GitHub', 'Slack'].map((src) => (
                    <span key={src} className="text-[9px] px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 border border-dark-700">
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom step labels */}
        <div className="flex justify-center gap-2 mt-8 pt-6 border-t border-dark-800/50">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                activeStep === i
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800/50'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                activeStep === i ? 'bg-brand text-white' : activeStep > i ? 'bg-dark-700 text-dark-300' : 'bg-dark-800 text-dark-500'
              }`}>
                {activeStep > i ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description below */}
      <div className="text-center mt-8">
        <p className="text-dark-400 text-sm leading-relaxed max-w-lg mx-auto">
          {steps[activeStep].desc}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { token } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Nav */}
      <nav className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #080810 100%)', border: '1px solid rgba(100,80,255,0.2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-7 h-7">
                <defs>
                  <linearGradient id="navCGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b5bff" /><stop offset="100%" stopColor="#7c3aff" /></linearGradient>
                  <linearGradient id="navHGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#5e3aff" /><stop offset="100%" stopColor="#9f37ff" /></linearGradient>
                  <filter id="navGlow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#navCGrad)" strokeWidth="5.5" strokeLinecap="round" filter="url(#navGlow)" />
                <circle cx="17" cy="32" r="4" fill="#3b5bff" filter="url(#navGlow)" />
                <g transform="translate(37,32)" filter="url(#navGlow)">
                  <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke="url(#navHGrad)" strokeWidth="2.5" strokeLinejoin="round" />
                  <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#navHGrad)" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="-7" y1="0" x2="7" y2="0" stroke="url(#navHGrad)" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="-7" y1="4" x2="7" y2="4" stroke="url(#navHGrad)" strokeWidth="2" strokeLinecap="round"/>
                </g>
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">ContextOS</span>
          </div>
          <div className="flex items-center gap-3">
            {isMounted && token ? (
              <Link
                href="/dashboard"
                className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-dark-400 hover:text-white transition text-sm font-medium px-3 py-1.5">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10 text-brand text-xs font-medium mb-8 tracking-wide uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-3.5 h-3.5">
            <defs>
              <linearGradient id="badgeCGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b5bff" /><stop offset="100%" stopColor="#7c3aff" /></linearGradient>
              <linearGradient id="badgeHGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#5e3aff" /><stop offset="100%" stopColor="#9f37ff" /></linearGradient>
            </defs>
            <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#badgeCGrad)" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="17" cy="32" r="4" fill="#3b5bff" />
            <g transform="translate(37,32)">
              <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke="url(#badgeHGrad)" strokeWidth="2.5" strokeLinejoin="round" />
              <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#badgeHGrad)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="-7" y1="0" x2="7" y2="0" stroke="url(#badgeHGrad)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="-7" y1="4" x2="7" y2="4" stroke="url(#badgeHGrad)" strokeWidth="2" strokeLinecap="round"/>
            </g>
          </svg>
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
            href={isMounted && token ? "/dashboard" : "/register"}
            className="bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-dark transition inline-flex items-center gap-2"
          >
            {isMounted && token ? "Go to Dashboard" : "Start Free"} <ArrowRight className="w-4 h-4" />
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

      {/* Features by Tier */}
      <section id="features" className="py-24 border-t border-dark-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-brand text-sm font-medium tracking-wide uppercase mb-3">Features</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">Everything you need, at every scale</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free features */}
            <div className="rounded-xl border border-dark-800 p-6">
              <p className="text-xs font-semibold text-dark-500 uppercase tracking-widest mb-5">Free</p>
              <div className="space-y-4">
                {[
                  { icon: Zap, title: 'AI Chat', desc: '25 queries/day with streaming responses and cited sources.' },
                  { icon: Search, title: 'Smart Retrieval', desc: 'Semantic search across up to 10K context chunks.' },
                  { icon: Shield, title: 'Encrypted Storage', desc: 'AES-256-GCM encryption for all tokens and data at rest.' },
                  { icon: Code2, title: 'VS Code Extension', desc: 'Ask questions in your editor with workspace context.' },
                ].map((f) => (
                  <div key={f.title} className="flex gap-3 group">
                    <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand/10 transition-colors">
                      <f.icon className="w-4 h-4 text-dark-500 group-hover:text-brand transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                      <p className="text-xs text-dark-500 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro features */}
            <div className="rounded-xl border-2 border-brand/30 bg-brand/[0.02] p-6">
              <p className="text-xs font-semibold text-brand uppercase tracking-widest mb-5">Pro</p>
              <div className="space-y-4">
                {[
                  { icon: Zap, title: 'Unlimited AI Chat', desc: 'No daily limits. Faster responses with priority queue.' },
                  { icon: Globe, title: 'Unlimited Integrations', desc: 'Connect all your GitHub, Notion, Slack & VS Code accounts.' },
                  { icon: Database, title: '100K Context Chunks', desc: 'Index larger codebases and longer project histories.' },
                  { icon: Users, title: 'Team Shared Context', desc: 'Share context across team members for smarter answers.' },
                  { icon: Github, title: 'Real-time Webhooks', desc: 'Push a commit, context updates instantly via webhooks.' },
                ].map((f) => (
                  <div key={f.title} className="flex gap-3 group">
                    <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
                      <f.icon className="w-4 h-4 text-brand transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                      <p className="text-xs text-dark-500 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team features */}
            <div className="rounded-xl border border-dark-800 p-6">
              <p className="text-xs font-semibold text-dark-500 uppercase tracking-widest mb-5">Team</p>
              <div className="space-y-4">
                {[
                  { icon: Users, title: 'Unlimited Members', desc: 'Add your entire engineering team with no seat limits.' },
                  { icon: Database, title: 'Unlimited Chunks', desc: 'No cap on context storage — index everything.' },
                  { icon: Shield, title: 'SSO & SAML', desc: 'Enterprise single sign-on for secure team access.' },
                  { icon: Zap, title: 'Dedicated Support', desc: 'Direct Slack channel with our engineering team.' },
                  { icon: FileText, title: 'Custom SLA', desc: 'Guaranteed uptime and priority incident response.' },
                ].map((f) => (
                  <div key={f.title} className="flex gap-3 group">
                    <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand/10 transition-colors">
                      <f.icon className="w-4 h-4 text-dark-500 group-hover:text-brand transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                      <p className="text-xs text-dark-500 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 border-t border-dark-800/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-brand text-sm font-medium tracking-wide uppercase mb-3">Pricing</p>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Simple, transparent pricing</h2>
          <p className="text-dark-400 mb-16">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto items-stretch">
            {/* Free */}
            <div className="bg-dark-900/30 border border-dark-800 rounded-xl p-7 text-left flex flex-col">
              <h3 className="text-base font-semibold text-white mb-1">Free</h3>
              <p className="text-3xl font-bold text-white mb-0.5">₹0<span className="text-sm text-dark-500 font-normal">/mo</span></p>
              <p className="text-dark-500 text-xs mb-6">For individual developers</p>
              <ul className="text-sm text-dark-400 space-y-2.5 flex-1">
                {['25 AI queries/day', '3 integrations', '10K context chunks', 'VS Code extension', 'AES-256 encryption', 'Community support'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dark-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full text-center border border-dark-700 text-white py-2.5 rounded-lg hover:bg-dark-800 transition text-sm font-medium mt-8"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-dark-900/30 border-2 border-brand/50 rounded-xl p-7 text-left relative flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                Popular
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Pro</h3>
              <p className="text-3xl font-bold text-white mb-0.5">₹999<span className="text-sm text-dark-500 font-normal">/mo</span></p>
              <p className="text-dark-500 text-xs mb-6">For developers & small teams</p>
              <ul className="text-sm text-dark-400 space-y-2.5 flex-1">
                {['Unlimited AI queries', 'Unlimited integrations', '100K context chunks', 'Real-time webhook sync', 'Team shared context', 'Priority support'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full text-center bg-brand text-white py-2.5 rounded-lg hover:bg-brand-dark transition text-sm font-medium mt-8"
              >
                Upgrade to Pro
              </Link>
            </div>

            {/* Team */}
            <div className="bg-dark-900/30 border border-dark-800 rounded-xl p-7 text-left flex flex-col">
              <h3 className="text-base font-semibold text-white mb-1">Team</h3>
              <p className="text-3xl font-bold text-white mb-0.5">₹2,999<span className="text-sm text-dark-500 font-normal">/mo</span></p>
              <p className="text-dark-500 text-xs mb-6">For growing teams & orgs</p>
              <ul className="text-sm text-dark-400 space-y-2.5 flex-1">
                {['Everything in Pro', 'Unlimited team members', 'Unlimited context chunks', 'SSO & SAML', 'Dedicated support channel', 'Custom SLA & uptime'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dark-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full text-center border border-dark-700 text-white py-2.5 rounded-lg hover:bg-dark-800 transition text-sm font-medium mt-8"
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
            href={isMounted && token ? "/dashboard" : "/register"}
            className="bg-brand text-white px-8 py-3.5 rounded-lg font-medium hover:bg-brand-dark transition inline-flex items-center gap-2"
          >
            {isMounted && token ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #080810 100%)', border: '1px solid rgba(100,80,255,0.2)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-6 h-6">
                  <defs>
                    <linearGradient id="ftCGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b5bff" /><stop offset="100%" stopColor="#7c3aff" /></linearGradient>
                    <linearGradient id="ftHGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#5e3aff" /><stop offset="100%" stopColor="#9f37ff" /></linearGradient>
                  </defs>
                  <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#ftCGrad)" strokeWidth="5.5" strokeLinecap="round" />
                  <circle cx="17" cy="32" r="4" fill="#3b5bff" />
                  <g transform="translate(37,32)">
                    <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke="url(#ftHGrad)" strokeWidth="2.5" strokeLinejoin="round" />
                    <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#ftHGrad)" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="-7" y1="0" x2="7" y2="0" stroke="url(#ftHGrad)" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="-7" y1="4" x2="7" y2="4" stroke="url(#ftHGrad)" strokeWidth="2" strokeLinecap="round"/>
                  </g>
                </svg>
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
