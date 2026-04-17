'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, LayoutDashboard, MessageSquare, Plug, Terminal, Rocket,
  ChevronRight, Sparkles, ArrowRight, Database, KeyRound, UserPlus,
  Zap, Shield, Github, FileText, Users, GitPullRequest, Command,
} from 'lucide-react'

/* ────────────────────────────────────────────────────────────
   Shared wireframe primitives
   ──────────────────────────────────────────────────────────── */

const wireBorder = '1px dashed rgba(255,255,255,0.12)'
const wireBorderSolid = '1px solid rgba(255,255,255,0.08)'
const wireBg = 'rgba(255,255,255,0.015)'
const wireBgAlt = 'rgba(255,255,255,0.03)'

function Callout({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.35)',
        color: '#fbbf24',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
      }}>{n}</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
        {label}
      </p>
    </div>
  )
}

function Marker({ n }: { n: number }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: 999,
      background: 'rgba(245,158,11,0.18)',
      border: '1.5px solid #fbbf24',
      color: '#fbbf24',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, lineHeight: 1,
      boxShadow: '0 0 0 3px rgba(10,10,15,0.9)',
    }}>{n}</div>
  )
}

function WireBox({
  children, style, dashed = true, pad = 12,
}: {
  children?: any; style?: any; dashed?: boolean; pad?: number | string
}) {
  return (
    <div style={{
      border: dashed ? wireBorder : wireBorderSolid,
      borderRadius: 8,
      padding: pad,
      background: wireBg,
      position: 'relative',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SkelLine({ w = '100%', h = 8, mt = 0, opacity = 0.12 }: { w?: any; h?: number; mt?: number; opacity?: number }) {
  return (
    <div style={{
      width: w, height: h, marginTop: mt,
      borderRadius: 4,
      background: `rgba(255,255,255,${opacity})`,
    }} />
  )
}

function SectionHeader({
  icon: Icon, eyebrow, title, tagline,
}: { icon: any; eyebrow: string; title: string; tagline: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 999,
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        color: '#fbbf24',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        <Icon style={{ width: 12, height: 12 }} />
        {eyebrow}
      </div>
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
        letterSpacing: '-0.01em', margin: 0, marginBottom: 6,
      }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0, maxWidth: 640 }}>{tagline}</p>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   1. Dashboard (Overview) wireframe
   ──────────────────────────────────────────────────────────── */

function DashboardWire() {
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
      {[0, 1, 2, 3].map((i) => (
        <WireBox key={i} style={{ minHeight: 70 }}>
          <SkelLine w="40%" h={6} opacity={0.2} />
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, letterSpacing: '-0.02em' }}>
            {['12', '847', '99.8%', '3.2s'][i]}
          </div>
          <SkelLine w="60%" h={5} mt={6} />
          {i === 0 && <div style={{ position: 'absolute', top: -10, right: -10 }}><Marker n={1} /></div>}
        </WireBox>
      ))}

      <div style={{ gridColumn: 'span 3' }}>
        <WireBox style={{ padding: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: wireBorderSolid, display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <SkelLine w={120} h={8} opacity={0.22} />
            <SkelLine w={60} h={8} opacity={0.18} />
            <div style={{ position: 'absolute', top: -10, right: -10 }}><Marker n={2} /></div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              padding: '10px 14px', display: 'grid',
              gridTemplateColumns: '18px 1fr 80px 60px', gap: 12, alignItems: 'center',
              borderBottom: i < 2 ? wireBorderSolid : 'none',
            }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }} />
              <SkelLine w="70%" h={6} opacity={0.18} />
              <div style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 9, fontWeight: 600,
                background: i === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.1)',
                color: i === 0 ? '#4ade80' : '#fbbf24', textAlign: 'center',
              }}>{i === 0 ? 'synced' : 'pending'}</div>
              <SkelLine w={40} h={5} opacity={0.14} />
            </div>
          ))}
        </WireBox>
      </div>

      <WireBox style={{ position: 'relative' }}>
        <SkelLine w="50%" h={7} opacity={0.22} />
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: '#fbbf24' }} />
              <SkelLine w={`${60 + i * 10}%`} h={5} opacity={0.14} />
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: -10, right: -10 }}><Marker n={3} /></div>
      </WireBox>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   2. Chat wireframe
   ──────────────────────────────────────────────────────────── */

function ChatWire() {
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, height: 320 }}>
      <WireBox style={{ position: 'relative', padding: 10 }}>
        <SkelLine w="60%" h={7} opacity={0.22} />
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              padding: '6px 8px', borderRadius: 5,
              background: i === 1 ? 'rgba(245,158,11,0.1)' : 'transparent',
              border: i === 1 ? '1px solid rgba(245,158,11,0.25)' : wireBorderSolid,
            }}>
              <SkelLine w="80%" h={5} opacity={i === 1 ? 0.4 : 0.15} />
              <SkelLine w="50%" h={4} mt={4} opacity={0.1} />
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: -10, left: -10 }}><Marker n={1} /></div>
      </WireBox>

      <WireBox style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
          {/* user bubble */}
          <div style={{ alignSelf: 'flex-end', maxWidth: '70%' }}>
            <div style={{
              padding: '8px 12px', borderRadius: '12px 12px 2px 12px',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <SkelLine w={180} h={6} opacity={0.3} />
            </div>
          </div>
          {/* assistant bubble */}
          <div style={{ alignSelf: 'flex-start', maxWidth: '80%', position: 'relative' }}>
            <div style={{
              padding: '10px 12px', borderRadius: '12px 12px 12px 2px',
              background: wireBgAlt, border: wireBorderSolid,
            }}>
              <SkelLine w="100%" h={5} opacity={0.2} />
              <SkelLine w="95%" h={5} mt={5} opacity={0.18} />
              <SkelLine w="70%" h={5} mt={5} opacity={0.16} />
              {/* source pills */}
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {['GitHub', 'Slack', 'Notion'].map((s) => (
                  <span key={s} style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)',
                    border: wireBorderSolid,
                  }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{ position: 'absolute', top: -8, right: -10 }}><Marker n={2} /></div>
          </div>
        </div>
        {/* composer */}
        <div style={{ padding: 12, borderTop: wireBorderSolid, position: 'relative' }}>
          <div style={{
            border: wireBorderSolid, borderRadius: 8, padding: '10px 12px',
            background: wireBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <SkelLine w="60%" h={6} opacity={0.14} />
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
            }} />
          </div>
          <div style={{ position: 'absolute', bottom: -10, right: -10 }}><Marker n={3} /></div>
        </div>
      </WireBox>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   3. Integrations wireframe
   ──────────────────────────────────────────────────────────── */

function IntegrationsWire() {
  const providers = [
    { label: 'GitHub', connected: true },
    { label: 'Notion', connected: true },
    { label: 'Slack', connected: false },
    { label: 'Linear', connected: false },
  ]
  return (
    <WireBox style={{ padding: 0 }}>
      <div style={{ padding: '12px 14px', borderBottom: wireBorderSolid, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <SkelLine w={140} h={8} opacity={0.22} />
        <div style={{
          padding: '5px 12px', borderRadius: 6,
          background: wireBgAlt, border: wireBorderSolid, fontSize: 10, color: 'var(--text-tertiary)',
        }}>Search…</div>
        <div style={{ position: 'absolute', top: -10, right: -10 }}><Marker n={1} /></div>
      </div>
      {providers.map((p, i) => (
        <div key={p.label} style={{
          padding: '12px 14px', display: 'grid',
          gridTemplateColumns: '28px 1fr 90px 90px', gap: 14, alignItems: 'center',
          borderBottom: i < providers.length - 1 ? wireBorderSolid : 'none',
          position: 'relative',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: wireBgAlt, border: wireBorderSolid,
          }} />
          <div>
            <SkelLine w={80} h={6} opacity={0.3} />
            <SkelLine w={160} h={5} mt={5} opacity={0.12} />
          </div>
          <div style={{
            padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 600, textAlign: 'center',
            background: p.connected ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
            color: p.connected ? '#4ade80' : 'var(--text-tertiary)',
            border: p.connected ? '1px solid rgba(34,197,94,0.2)' : wireBorderSolid,
          }}>{p.connected ? 'connected' : 'not linked'}</div>
          <div style={{
            padding: '5px 10px', borderRadius: 6, textAlign: 'center', fontSize: 10, fontWeight: 600,
            background: p.connected ? wireBgAlt : 'linear-gradient(135deg, #fbbf24, #d97706)',
            color: p.connected ? 'var(--text-secondary)' : '#0a0a0f',
            border: p.connected ? wireBorderSolid : 'none',
          }}>{p.connected ? 'Manage' : 'Connect'}</div>
          {i === 0 && <div style={{ position: 'absolute', top: -10, left: 14 }}><Marker n={2} /></div>}
          {i === 2 && <div style={{ position: 'absolute', top: -4, right: -10 }}><Marker n={3} /></div>}
        </div>
      ))}
    </WireBox>
  )
}

/* ────────────────────────────────────────────────────────────
   4. VS Code extension wireframe
   ──────────────────────────────────────────────────────────── */

function ExtensionWire() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, height: 320, position: 'relative' }}>
      <WireBox style={{ padding: 10, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Sparkles style={{ width: 12, height: 12, color: '#fbbf24' }} />
          <SkelLine w="60%" h={6} opacity={0.25} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              padding: 8, borderRadius: 6, background: wireBgAlt, border: wireBorderSolid,
            }}>
              <SkelLine w="80%" h={5} opacity={0.22} />
              <SkelLine w="55%" h={4} mt={4} opacity={0.12} />
            </div>
          ))}
        </div>
        {/* composer */}
        <div style={{
          marginTop: 12, padding: '8px 10px', borderRadius: 6,
          background: wireBg, border: wireBorderSolid,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <SkelLine w="60%" h={5} opacity={0.12} />
          <div style={{ width: 14, height: 14, borderRadius: 4, background: 'linear-gradient(135deg, #fbbf24, #d97706)' }} />
        </div>
        <div style={{ position: 'absolute', top: -10, left: -10 }}><Marker n={1} /></div>
      </WireBox>

      <WireBox style={{ padding: 14, position: 'relative', fontFamily: 'var(--font-mono, monospace)' }}>
        {/* editor lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 10, width: 16, textAlign: 'right', opacity: 0.5 }}>{i + 1}</span>
            <SkelLine w={`${35 + ((i * 17) % 50)}%`} h={5} opacity={0.16} />
          </div>
        ))}
        {/* highlight line = selection */}
        <div style={{
          marginTop: 4, padding: '4px 6px', borderRadius: 3,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: '#fbbf24', fontSize: 10, width: 16, textAlign: 'right' }}>7</span>
          <SkelLine w="45%" h={5} opacity={0.3} />
        </div>
        <div style={{ position: 'absolute', bottom: -10, right: -10 }}><Marker n={2} /></div>
      </WireBox>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   5. Actions command palette wireframe
   ──────────────────────────────────────────────────────────── */

function ActionsWire() {
  const actions = [
    { icon: GitPullRequest, label: 'Git: Commit, Push & Open PR', hint: 'contextos.git.commitPushPR' },
    { icon: Github,         label: 'GitHub: Create Issue',         hint: 'contextos.github.createIssue' },
    { icon: Github,         label: 'GitHub: Create Pull Request',  hint: 'contextos.github.createPR' },
    { icon: FileText,       label: 'Notion: Create Page',          hint: 'contextos.notion.createPage' },
    { icon: MessageSquare,  label: 'Slack: Send Message',          hint: 'contextos.slack.sendMessage' },
  ]
  return (
    <WireBox style={{ padding: 0, maxWidth: 560, margin: '0 auto', position: 'relative' }}>
      <div style={{
        padding: '10px 12px', borderBottom: wireBorderSolid,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Command style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
          &gt; ContextOS:<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}> action</span>
          <span style={{
            display: 'inline-block', width: 1, height: 12,
            background: '#fbbf24', marginLeft: 2, verticalAlign: 'middle',
            animation: 'blink 1s steps(2) infinite',
          }} />
        </span>
      </div>
      {actions.map((a, i) => (
        <div key={a.label} style={{
          padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10,
          background: i === 0 ? 'rgba(245,158,11,0.08)' : 'transparent',
          borderBottom: i < actions.length - 1 ? wireBorderSolid : 'none',
          borderLeft: i === 0 ? '2px solid #fbbf24' : '2px solid transparent',
        }}>
          <a.icon style={{ width: 13, height: 13, color: i === 0 ? '#fbbf24' : 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 12, color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1, fontWeight: i === 0 ? 600 : 400 }}>
            {a.label}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace', opacity: 0.6 }}>
            {a.hint}
          </span>
        </div>
      ))}
      <div style={{ position: 'absolute', top: -10, right: -10 }}><Marker n={1} /></div>
      <div style={{ position: 'absolute', top: 36, left: -10 }}><Marker n={2} /></div>
    </WireBox>
  )
}

/* ────────────────────────────────────────────────────────────
   Flow diagram
   ──────────────────────────────────────────────────────────── */

function FlowDiagram() {
  const steps = [
    { icon: Plug,          label: 'Connect' },
    { icon: Database,      label: 'Sync' },
    { icon: Sparkles,      label: 'Index' },
    { icon: MessageSquare, label: 'Ask' },
    { icon: Rocket,        label: 'Act' },
  ]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, flexWrap: 'wrap', padding: '20px 12px',
      border: wireBorder, borderRadius: 10, background: wireBg,
    }}>
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '10px 14px', borderRadius: 8,
            background: wireBgAlt, border: wireBorderSolid, minWidth: 90,
          }}>
            <s.icon style={{ width: 16, height: 16, color: '#fbbf24' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight style={{ width: 14, height: 14, color: 'var(--text-tertiary)', opacity: 0.5 }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Onboarding checklist
   ──────────────────────────────────────────────────────────── */

const ONBOARDING = [
  { icon: UserPlus, title: 'Create your account', desc: 'Sign up with email. Free plan — no card needed.', href: '/register' },
  { icon: Plug,     title: 'Connect one integration', desc: 'Start with GitHub. One OAuth click, encrypted at rest.', href: '/dashboard/integrations' },
  { icon: Database, title: 'Wait 30s for sync',      desc: 'We pull, chunk, and embed. Webhooks keep it fresh.', href: '/dashboard' },
  { icon: MessageSquare, title: 'Ask your first question', desc: 'Open Chat and ask anything. Every answer is cited.', href: '/dashboard/chat' },
  { icon: KeyRound, title: 'Install the VS Code extension', desc: 'Paste your API key. Chat + actions in your editor.', href: '/dashboard/settings' },
  { icon: Rocket,   title: 'Run a workflow action', desc: 'Cmd+Shift+P → "ContextOS: Commit, Push & Open PR".', href: '/dashboard/settings' },
]

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */

export default function GuidePage() {
  const [done, setDone] = useState<Record<number, boolean>>({})

  const toggle = (i: number) => setDone((d) => ({ ...d, [i]: !d[i] }))

  return (
    <>
      <style jsx global>{`
        @keyframes blink { 50% { opacity: 0 } }
      `}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Page header */}
        <header style={{ marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: '#fbbf24',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            <BookOpen style={{ width: 12, height: 12 }} /> Guide
          </div>
          <h1 style={{
            fontSize: 32, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.02em', margin: 0, marginBottom: 8,
          }}>
            How to use ContextOS
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-tertiary)', margin: 0, maxWidth: 680, lineHeight: 1.6 }}>
            A visual walkthrough of every surface — the dashboard, chat, integrations, extension,
            and workflow actions. Each section includes a wireframe of what you'll see and what every
            part of the UI does.
          </p>
        </header>

        {/* Flow summary */}
        <section style={{ marginBottom: 48 }}>
          <FlowDiagram />
        </section>

        {/* Onboarding checklist */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{
            fontSize: 18, fontWeight: 600, color: 'var(--text-primary)',
            letterSpacing: '-0.01em', margin: 0, marginBottom: 4,
          }}>Your first 5 minutes</h2>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, marginBottom: 16 }}>
            Tick these off as you go. Each step links to the right page.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {ONBOARDING.map((step, i) => (
              <div key={step.title} className="surface" style={{
                padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
                cursor: 'pointer', position: 'relative', transition: 'all var(--t-fast)',
              }} onClick={() => toggle(i)}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done[i] ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.1)',
                  border: done[i] ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(245,158,11,0.25)',
                  color: done[i] ? '#4ade80' : '#fbbf24',
                }}>
                  {done[i] ? '✓' : <step.icon style={{ width: 14, height: 14 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, letterSpacing: '0.06em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                      margin: 0, textDecoration: done[i] ? 'line-through' : 'none',
                      opacity: done[i] ? 0.6 : 1,
                    }}>{step.title}</h3>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 8px', lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                  <Link href={step.href} onClick={(e) => e.stopPropagation()} style={{
                    fontSize: 11, color: '#fbbf24', fontWeight: 600, textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                    Open <ChevronRight style={{ width: 11, height: 11 }} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 1: Dashboard */}
        <WireSection
          icon={LayoutDashboard}
          eyebrow="Overview"
          title="The Dashboard"
          tagline="Your command center — every connected service, what's syncing, what's healthy, and what's happening right now."
          wire={<DashboardWire />}
          callouts={[
            'Stat tiles — resource counts, query volume, uptime, and average response time. The first tile always shows connected integrations.',
            'Service registry — every connected provider with its sync status (synced / pending / error) and last activity timestamp. Click any row to jump into its sync log.',
            'Activity feed — realtime stream of commits, edits, and chats flowing into your context store. A steady pulse here means your AI has fresh data.',
          ]}
        />

        {/* Section 2: Chat */}
        <WireSection
          icon={MessageSquare}
          eyebrow="Chat"
          title="Ask your whole project"
          tagline="A ChatGPT-style interface that answers from your real GitHub, Notion, Slack, and Linear — with citations on every response."
          wire={<ChatWire />}
          callouts={[
            'Conversation list — pinned on the left. Each thread keeps its history so you can resume context later. Click a title to switch threads.',
            'Cited answers — the assistant bubble shows grounded prose with source pills (GitHub / Slack / Notion) linking to the exact commit, thread, or page it used.',
            'Composer — type a question and hit Enter. Responses stream token-by-token so you see reasoning appear live.',
          ]}
        />

        {/* Section 3: Integrations */}
        <WireSection
          icon={Plug}
          eyebrow="Integrations"
          title="Connect the tools you already use"
          tagline="One-click OAuth to plug in GitHub, Notion, Slack, Linear, and Google Drive. Tokens are AES-256-GCM encrypted before they ever touch the database."
          wire={<IntegrationsWire />}
          callouts={[
            'Search + filter — as your list grows, filter by provider name to find the one you want to manage.',
            'Connected row — shows provider icon, account name, connection status, and a Manage button for disconnect or force-resync.',
            'Connect button — kicks off OAuth in a new tab. When you return, the row flips to "connected" and the initial sync begins automatically.',
          ]}
        />

        {/* Section 4: VS Code Extension */}
        <WireSection
          icon={Terminal}
          eyebrow="Extension"
          title="Context where you code"
          tagline="Install the ContextOS extension, paste your API key from Settings, and get the same grounded answers without leaving your editor."
          wire={<ExtensionWire />}
          callouts={[
            'Sidebar chat — same Chat experience as the web, pinned inside VS Code. Your conversation history syncs so you can jump between surfaces.',
            'Inline "Ask about this" — select code, right-click, and ask a question scoped to the selection. The extension adds the file path and selection as context automatically.',
          ]}
        />

        {/* Section 5: Actions */}
        <WireSection
          icon={Rocket}
          eyebrow="Actions"
          title="Write back to your tools"
          tagline="From the command palette, trigger workflows that write to your real accounts: open PRs, create issues, send Slack messages, draft Notion pages."
          wire={<ActionsWire />}
          callouts={[
            'Command palette — press Ctrl / Cmd + Shift + P in VS Code and type "ContextOS" to see every available action.',
            '"Commit, Push & Open PR" — the flagship workflow. Prompts for a commit message, stages all changes, pushes with upstream tracking, and opens a GitHub PR via your connected OAuth account. No tokens, no tab-switching.',
          ]}
        />

        {/* FAQ */}
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0, marginBottom: 16 }}>
            Frequently asked
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                q: 'Where are my OAuth tokens stored?',
                a: 'Encrypted with AES-256-GCM using a per-tenant key, then stored in our managed Postgres. We never log or display tokens in plaintext, even to admins.',
              },
              {
                q: 'Does ContextOS train on my data?',
                a: 'No. Your context is only ever used to ground answers for your own account. Nothing is shared with third parties or used for training.',
              },
              {
                q: 'How fresh is the context the AI sees?',
                a: 'Webhooks push updates in realtime for GitHub, Notion, Slack, and Linear. Most changes are indexed in under a minute.',
              },
              {
                q: 'What happens on the Free plan when I hit 25 queries?',
                a: 'The Chat interface shows a friendly rate-limit notice and suggests upgrading to Pro. No data loss, no hidden charges.',
              },
            ].map((f) => (
              <details key={f.q} className="surface" style={{ padding: '14px 18px', cursor: 'pointer' }}>
                <summary style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  {f.q}
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
                </summary>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '10px 0 0', lineHeight: 1.6 }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Security note */}
        <section style={{ marginTop: 36 }}>
          <div className="surface" style={{
            padding: 18, display: 'flex', alignItems: 'flex-start', gap: 14,
            border: '1px solid rgba(245,158,11,0.2)',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.04), transparent)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: 'rgba(245,158,11,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield style={{ width: 18, height: 18, color: '#fbbf24' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
                Security by default
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                AES-256-GCM encryption at rest, TLS in transit, and per-user API keys you can revoke any time from{' '}
                <Link href="/dashboard/settings" style={{ color: '#fbbf24', textDecoration: 'none' }}>Settings</Link>.
                Disconnect a provider and its tokens are wiped immediately.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

/* ────────────────────────────────────────────────────────────
   WireSection — wireframe + annotated callouts layout
   ──────────────────────────────────────────────────────────── */

function WireSection({
  icon, eyebrow, title, tagline, wire, callouts,
}: {
  icon: any; eyebrow: string; title: string; tagline: string;
  wire: any; callouts: string[];
}) {
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHeader icon={icon} eyebrow={eyebrow} title={title} tagline={tagline} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 24, alignItems: 'flex-start' }}>
        <div className="surface" style={{ padding: 20, background: 'rgba(0,0,0,0.25)' }}>
          {wire}
          <p style={{
            fontSize: 10, color: 'var(--text-tertiary)',
            textAlign: 'center', marginTop: 14, marginBottom: 0,
            letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5,
          }}>
            wireframe · not actual data
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
          {callouts.map((c, i) => (
            <Callout key={i} n={i + 1} label={c} />
          ))}
        </div>
      </div>
    </section>
  )
}
