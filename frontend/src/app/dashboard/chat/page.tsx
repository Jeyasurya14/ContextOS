'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Plus, Copy, CheckCheck,
  Sparkles, Database, Brain, AlertCircle, ExternalLink, Hash, CornerDownLeft
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

/* ─── Types ─────────────────────────────────────────── */
interface ThinkingStep {
  type: 'thinking' | 'searching' | 'generating'
  message: string
  source?: string
  count?: number
  done?: boolean
}

interface Source {
  type: string
  url?: string
  title?: string
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  thinkingSteps?: ThinkingStep[]
  sources?: Source[]
  isStreaming?: boolean
  isError?: boolean
  timestamp?: Date
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const SUGGESTED = [
  "What's the status of my recent PRs?",
  "Summarize my Notion docs",
  "What did I work on last week?",
  "Show me open GitHub issues",
]

const STORAGE_KEY = 'contextos_chats_v3'

/* ─── Markdown renderer ──────────────────────────────── */
function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="chat-code-block"><div class="chat-code-lang">${lang || 'code'}</div><code>${escHtml(code.trim())}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code class="chat-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="chat-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="chat-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="chat-h1">$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote class="chat-bq">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="chat-hr" />')

  // Lists
  html = html.replace(/^[-*] (.+)$/gm, '<li class="chat-li">$1</li>')
  html = html.replace(/(<li class="chat-li">[\s\S]+?<\/li>(?:\n|$))+/g, (m) => `<ul class="chat-ul">${m}</ul>`)

  // Paragraphs
  html = html.replace(/\n\n+/g, '\n\n')
  html = html.split('\n\n').map(block => {
    if (block.match(/^<(h[1-3]|ul|pre|blockquote|hr)/)) return block
    if (!block.trim()) return ''
    return `<p class="chat-p">${block.replace(/\n/g, '<br/>')}</p>`
  }).join('')

  return html
}

/* ─── Provider colors ────────────────────────────────── */
const PROVIDER_COLORS: Record<string, string> = {
  github: '#8b5cf6',
  notion: '#a1a1aa',
  slack: '#e01e5a',
  linear: '#5b5fc7',
  google: '#34a853',
  google_drive: '#34a853',
}

function getProviderIcon(type: string) {
  const t = (type || '').toLowerCase()
  if (t === 'github') return <Database className="w-3 h-3" />
  if (t === 'notion') return <Database className="w-3 h-3" />
  if (t === 'slack') return <Hash className="w-3 h-3" />
  if (t === 'linear') return <Database className="w-3 h-3" />
  return <Database className="w-3 h-3" />
}

/* ─── Source chip ────────────────────────────────────── */
function SourceChip({ source }: { source: Source }) {
  const type = (source.type || '').split('_')[0]
  const color = PROVIDER_COLORS[source.type?.toLowerCase()] || 'var(--text-tertiary)'
  
  return (
    <a
      href={source.url || '#'}
      target={source.url ? '_blank' : undefined}
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', borderRadius: 'var(--r-sm)',
        fontSize: 11, fontWeight: 500, textDecoration: 'none',
        background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)', transition: 'border-color var(--t-fast)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
    >
      <span style={{ color }}>{getProviderIcon(source.type)}</span>
      <span style={{ textTransform: 'capitalize' }}>{type}</span>
      {source.url && <ExternalLink style={{ width: 10, height: 10, color: 'var(--text-tertiary)' }} />}
    </a>
  )
}

/* ─── Thinking dots ──────────────────────────────────── */
function Dots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, marginLeft: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4, height: 4, borderRadius: '50%', background: 'var(--text-tertiary)',
            animation: `ctxBounce 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

/* ─── Status panel ───────────────────────────────────── */
function StatusPanel({ steps }: { steps: ThinkingStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1 && !step.done
        const isDone = step.done || (!isLast && i < steps.length - 1)
        
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isDone ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
            <span style={{ flexShrink: 0 }}>
              {isDone
                ? <CheckCheck style={{ width: 14, height: 14, color: 'var(--success-text)' }} />
                : step.type === 'thinking' ? <Brain style={{ width: 14, height: 14 }} /> : <Database style={{ width: 14, height: 14 }} />
              }
            </span>
            <span style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
              {step.message}
              {step.source && ` · ${step.source}${step.count ? ` (${step.count})` : ''}`}
            </span>
            {isLast && <Dots />}
          </div>
        )
      })}
    </div>
  )
}

/* ─── ContextOS logo ────────────────────────── */
function CtxLogo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="c_lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14C16 14 10 21 10 32s6 18 18 18" stroke="url(#c_lg)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="url(#c_lg)" />
      <path d="M37 18l13 7.5V39L37 46.5 24 39V25.5z" stroke="url(#c_lg)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="30" y1="28" x2="44" y2="28" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="32" x2="44" y2="32" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="36" x2="44" y2="36" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Message bubble ─────────────────────────────────── */
function MessageBubble({
  msg, onCopy, copiedId,
}: { msg: Message; onCopy: (c: string, id: number) => void; copiedId: number | null }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ maxWidth: '80%' }}>
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--r-lg)',
            borderBottomRightRadius: 'var(--r-sm)',
            fontSize: 14, lineHeight: 1.5,
            background: 'var(--text-primary)', color: 'var(--bg-base)',
          }}>
            {msg.content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="anim-fade-up" style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: 'var(--r-sm)', flexShrink: 0, marginTop: 4,
        background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <CtxLogo size={16} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, marginTop: 10 }}>
          ContextOS
        </div>

        {/* Status steps */}
        {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
          <StatusPanel steps={msg.thinkingSteps} />
        )}

        {/* Error */}
        {msg.isError && (
          <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 'var(--r-md)', background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: 13 }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
            <span>{msg.content}</span>
          </div>
        )}

        {/* Content */}
        {!msg.isError && msg.content && (
          <div className="chat-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        )}

        {/* Streaming indicator */}
        {msg.isStreaming && !msg.content && !msg.thinkingSteps?.length && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 24 }}>
            <Dots />
          </div>
        )}

        {/* Streaming cursor */}
        {msg.isStreaming && msg.content && (
          <span className="anim-pulse" style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--brand)', verticalAlign: 'middle', marginLeft: 4 }} />
        )}

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {msg.sources.map((s, i) => <SourceChip key={i} source={s} />)}
          </div>
        )}

        {/* Actions */}
        {!msg.isStreaming && msg.content && !msg.isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <button
              className="btn"
              onClick={() => onCopy(msg.content, msg.id)}
              style={{ background: 'transparent', padding: '4px 8px', fontSize: 11, border: 'none', color: copiedId === msg.id ? 'var(--success-text)' : 'var(--text-tertiary)' }}
            >
              {copiedId === msg.id ? <CheckCheck style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
              {copiedId === msg.id ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Empty state ────────────────────────────────────── */
function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <CtxLogo size={28} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>How can I help today?</h2>
      <p style={{ fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 400, marginBottom: 40, lineHeight: 1.5 }}>
        Ask me anything about your project — commits, docs, issues, or general engineering questions across your connected sources.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, width: '100%', maxWidth: 520 }}>
        {SUGGESTED.map((q) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
              fontSize: 13, color: 'var(--text-secondary)', transition: 'all var(--t-fast)',
              display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}
          >
            <Sparkles style={{ width: 14, height: 14, color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────── */
export default function ChatPage() {
  const { toast } = useToast()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const chatsRef = useRef<Chat[]>([])
  const currentChatIdRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatsRef.current = chats }, [chats])
  useEffect(() => { currentChatIdRef.current = currentChatId }, [currentChatId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: Chat[] = JSON.parse(raw)
        if (parsed.length > 0) {
          setChats(parsed)
          setCurrentChatId(parsed[0].id)
          setMessages(parsed[0].messages || [])
        }
      }
    } catch {}
  }, [])

  const persistChats = useCallback((updated: Chat[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
    setChats(updated)
    chatsRef.current = updated
  }, [])

  const saveMessages = useCallback((msgs: Message[], chatId: string) => {
    const current = chatsRef.current
    const title = msgs.length > 0 ? msgs[0].content.slice(0, 40) + '...' : 'New conversation'
    const updated = current.map(c => c.id === chatId ? { ...c, messages: msgs, title, updatedAt: new Date() } : c)
    persistChats(updated)
  }, [persistChats])

  const createNewChat = useCallback(() => {
    const chat: Chat = { id: Date.now().toString(), title: 'New conversation', messages: [], createdAt: new Date(), updatedAt: new Date() }
    persistChats([chat, ...chatsRef.current])
    setCurrentChatId(chat.id)
    setMessages([])
  }, [persistChats])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleCopy = async (content: string, id: number) => {
    try { await navigator.clipboard.writeText(content); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) } catch {}
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    let chatId = currentChatIdRef.current
    if (!chatId) {
      const chat: Chat = { id: Date.now().toString(), title: 'New conversation', messages: [], createdAt: new Date(), updatedAt: new Date() }
      persistChats([chat, ...chatsRef.current])
      chatId = chat.id; setCurrentChatId(chat.id)
    }

    const userMsg: Message = { id: Date.now(), role: 'user', content: text, timestamp: new Date() }
    const assistantMsg: Message = { id: Date.now() + 1, role: 'assistant', content: '', isStreaming: true, thinkingSteps: [], timestamp: new Date() }
    
    setMessages([...messages, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)
    saveMessages([...messages, userMsg], chatId)

    const token = useAuthStore.getState().token
    if (!token) { setIsStreaming(false); return }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const resp = await fetch(`${apiUrl}/api/v1/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ question: text })
      })

      if (!resp.ok) throw new Error()
      const reader = resp.body?.getReader()
      if (!reader) throw new Error()

      let accumulated = ''
      let stepsLog: ThinkingStep[] = []
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.event === 'thinking') { stepsLog = [...stepsLog, { type: 'thinking', message: data.message || 'Thinking…' }] }
            else if (data.event === 'searching') { stepsLog = [...stepsLog, { type: 'searching', message: `Searching ${data.source}`, source: data.source, count: data.count }] }
            else if (data.event === 'token') {
              accumulated += data.content
              if (stepsLog.some(s => !s.done)) stepsLog = stepsLog.map(s => ({ ...s, done: true }))
            }
            // Realtime updates
            setMessages(prev => {
              const u = [...prev]
              if (data.event === 'sources') u[u.length - 1] = { ...u[u.length - 1], sources: data.sources }
              else if (data.event === 'done') u[u.length - 1] = { ...u[u.length - 1], isStreaming: false }
              else if (data.event === 'error') u[u.length - 1] = { ...u[u.length - 1], content: data.message, isStreaming: false, isError: true }
              else u[u.length - 1] = { ...u[u.length - 1], content: accumulated || '', thinkingSteps: stepsLog }
              return u
            })
          } catch {}
        }
      }

      setMessages(prev => {
        const final = prev.map((m, i) => i === prev.length - 1 ? { ...m, isStreaming: false } : m)
        if (chatId) saveMessages(final, chatId)
        return final
      })
    } catch {
      setMessages(p => {
        const u = [...p]
        u[u.length - 1] = { ...u[u.length - 1], content: 'Error connecting to brain.', isStreaming: false, isError: true }
        if (chatId) saveMessages(u, chatId)
        return u
      })
    } finally { setIsStreaming(false) }
  }, [input, isStreaming, messages, saveMessages, persistChats])

  return (
    <>
      <style>{`
        @keyframes ctxBounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-2px); opacity: 1; } }
        /* Chat Prose Markdown Overrides for minimal SaaS look */
        .chat-prose { font-size: 14px; line-height: 1.6; color: var(--text-secondary); }
        .chat-prose p { margin-bottom: 1em; }
        .chat-prose strong { color: var(--text-primary); font-weight: 600; }
        .chat-prose .chat-h1, .chat-prose .chat-h2, .chat-prose .chat-h3 { color: var(--text-primary); font-weight: 600; margin: 1.5em 0 0.5em; }
        .chat-prose ul { padding-left: 1.5em; list-style-type: disc; margin-bottom: 1em; }
        .chat-prose li { margin-bottom: 0.25em; }
        .chat-prose code.chat-inline-code { font-family: monospace; font-size: 0.9em; background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 0.15em 0.3em; border-radius: 4px; color: var(--text-primary); }
        .chat-prose pre.chat-code-block { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: var(--r-md); overflow: hidden; margin-bottom: 1em; }
        .chat-prose pre .chat-code-lang { background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle); padding: 6px 12px; font-size: 11px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 600; }
        .chat-prose pre code { display: block; padding: 12px; font-family: monospace; font-size: 13px; overflow-x: auto; color: var(--text-primary); }
      `}</style>
      
      <div style={{ display: 'flex', height: 'calc(100vh - 73px)', marginTop: '-36px', marginLeft: '-40px', marginRight: '-40px', borderTop: '1px solid var(--border-subtle)' }}>
        
        {/* Chat History Sidebar */}
        <div style={{ width: sidebarOpen ? 260 : 0, transition: 'width var(--t-fast)', borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 8px' }}>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={createNewChat}>
              <Plus style={{ width: 14, height: 14 }} /> New Conversation
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {chats.map(c => (
              <button
                key={c.id}
                onClick={() => { setCurrentChatId(c.id); setMessages(c.messages || []) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r-md)',
                  background: currentChatId === c.id ? 'var(--bg-surface)' : 'transparent',
                  border: currentChatId === c.id ? '1px solid var(--border-base)' : '1px solid transparent',
                  color: currentChatId === c.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  transition: 'all var(--t-fast)', cursor: 'pointer'
                }}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 0' }}>
            <div style={{ maxWidth: 768, margin: '0 auto', padding: '0 24px' }}>
              {messages.length === 0 ? (
                <EmptyState onSuggest={s => { setInput(s); setTimeout(handleSend, 50) }} />
              ) : (
                <>
                  {messages.map(m => (
                    <MessageBubble key={m.id} msg={m} onCopy={handleCopy} copiedId={copiedId} />
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ maxWidth: 768, margin: '0 auto' }}>
              <div style={{ position: 'relative', display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-sm)' }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Ask any question across your workspace..."
                  style={{
                    flex: 1, width: '100%', minHeight: 52, maxHeight: 200, padding: '14px 48px 14px 16px',
                    background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14,
                    resize: 'none', outline: 'none'
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, padding: 0, borderRadius: 'var(--r-md)' }}
                >
                  <CornerDownLeft style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                AI responses can be inaccurate. Always review references carefully.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}