'use client'

import { useRef, useState, useEffect } from 'react'
import {
  Plus, Copy, CheckCheck, Sparkles, Database, AlertCircle,
  ChevronRight, MessageSquare, Search, ArrowUp, PanelLeftClose,
  Code2, FileText, Lightbulb, GitBranch, Trash2, Loader2
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { queryApi, promptsApi, type PromptItem } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

/* ─── Types ─────────────────────────────────────────── */
interface ThinkingStep {
  type: 'thinking' | 'searching' | 'generating'
  message: string
  source?: string
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

  html = html.replace(/^[-*] (.+)$/gm, '<li class="chat-li">$1</li>')
  html = html.replace(/(<li class="chat-li">[\s\S]+?<\/li>(?:\n|$))+/g, (m) => `<ul class="chat-ul">${m}</ul>`)

  html = html.split('\n\n').map(block => {
    if (block.match(/^<(h[1-3]|ul|pre|blockquote|hr)/)) return block
    if (!block.trim()) return ''
    return `<p class="chat-p">${block.replace(/\n/g, '<br/>')}</p>`
  }).join('')

  return html
}

const SUGGESTIONS = [
  { icon: Code2, text: 'Find recent PRs in our repos', category: 'Code' },
  { icon: FileText, text: 'Summarize this week\'s Notion updates', category: 'Docs' },
  { icon: Lightbulb, text: 'What is our team working on?', category: 'Team' },
  { icon: GitBranch, text: 'Show open issues across Linear', category: 'Projects' },
]

/* ─── Message component (Claude/ChatGPT style) ─── */
function MessageBubble({ msg, onCopy, copiedId }: { msg: Message; onCopy: (c: string, id: number) => void; copiedId: number | null }) {
  const isUser = msg.role === 'user'

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 24px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, flexShrink: 0, marginTop: 2,
          borderRadius: '50%',
          background: isUser ? 'var(--bg-raised)' : 'linear-gradient(135deg, #fbbf24, #d97706)',
          border: isUser ? '1px solid var(--border-base)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          color: isUser ? 'var(--text-secondary)' : '#0a0a0f',
          letterSpacing: '-0.02em',
        }}>
          {isUser ? 'U' : 'C'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.005em' }}>
            {isUser ? 'You' : 'ContextOS'}
          </div>

          {/* Thinking steps */}
          {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 14,
            }}>
              {msg.thinkingSteps.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, color: step.done ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  marginBottom: i < msg.thinkingSteps!.length - 1 ? 6 : 0,
                }}>
                  {step.done
                    ? <CheckCheck size={13} style={{ color: 'var(--brand-text)' }} />
                    : <Loader2 size={13} className="anim-spin" style={{ color: 'var(--text-tertiary)' }} />}
                  <span>{step.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {msg.content ? (
            <div className="chat-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
          ) : msg.isStreaming && (!msg.thinkingSteps || msg.thinkingSteps.length === 0) ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 0' }}>
              <span className="dot-bounce" />
              <span className="dot-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="dot-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          ) : null}

          {/* Sources */}
          {msg.sources && msg.sources.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {msg.sources.slice(0, 6).map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 999,
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                }}>
                  <Database size={10} />
                  <span style={{ textTransform: 'capitalize' }}>{s.type.split('_')[0]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions (only assistant messages after streaming) */}
          {!isUser && !msg.isStreaming && msg.content && (
            <div style={{ marginTop: 14, display: 'flex', gap: 4 }}>
              <button
                onClick={() => onCopy(msg.content, msg.id)}
                className="btn btn-ghost"
                style={{
                  height: 28, padding: '0 8px', fontSize: 12,
                  color: copiedId === msg.id ? 'var(--brand-text)' : 'var(--text-tertiary)',
                }}
              >
                {copiedId === msg.id ? <CheckCheck size={12} /> : <Copy size={12} />}
                {copiedId === msg.id ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main ─── */
export default function ChatPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Prompt picker (triggered by typing '/' at the start of an empty input)
  const [allPrompts, setAllPrompts] = useState<PromptItem[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerIndex, setPickerIndex] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadConversations()
    // Preload the user's saved prompts for the / picker
    promptsApi.list()
      .then(r => setAllPrompts(r.data.prompts || []))
      .catch(() => {})
    // If the user came here from the Prompts library with "Use in chat",
    // seed the composer with the prompt body and focus it.
    if (typeof window !== 'undefined') {
      const seeded = sessionStorage.getItem('contextos:seedPrompt')
      if (seeded) {
        sessionStorage.removeItem('contextos:seedPrompt')
        setInput(seeded)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  const loadConversations = async () => {
    try {
      const res = await queryApi.listConversations()
      setChats(res.data.map((c: any) => ({
        id: c.id,
        title: c.title,
        messages: [],
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
      })))
    } catch {}
  }

  const loadConversationDetails = async (id: string) => {
    try {
      const res = await queryApi.getConversation(id)
      const mappedMsgs = res.data.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        timestamp: new Date(m.created_at),
      }))
      setMessages(mappedMsgs)
    } catch {
      toast.error('Failed to load conversation')
    }
  }

  useEffect(() => {
    if (currentChatId) loadConversationDetails(currentChatId)
  }, [currentChatId])

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || isStreaming) return
    if (!overrideText) setInput('')

    let chatId = currentChatId
    if (!chatId) {
      chatId = Date.now().toString()
      const newChat: Chat = { id: chatId, title: text.slice(0, 40), messages: [], createdAt: new Date(), updatedAt: new Date() }
      setChats(prev => [newChat, ...prev])
      setCurrentChatId(chatId)
    }

    const userMsg: Message = { id: Date.now(), role: 'user', content: text, timestamp: new Date() }
    const assistantMsg: Message = { id: Date.now() + 1, role: 'assistant', content: '', isStreaming: true, thinkingSteps: [], timestamp: new Date() }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    const token = useAuthStore.getState().token || ''
    try {
      const resp = await queryApi.stream(text, token, { conversation_id: currentChatId || undefined })
      const reader = resp.body?.getReader()
      if (!reader) throw new Error()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const raw = decoder.decode(value)
        const lines = raw.split('\n')

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.event === 'token') accumulated += data.content

            setMessages(prev => {
              const u = [...prev]
              const last = u[u.length - 1]
              if (!last || last.role !== 'assistant') return prev

              if (data.event === 'thinking') {
                last.thinkingSteps = [...(last.thinkingSteps || []), { type: 'thinking', message: data.message, done: true }]
              } else if (data.event === 'searching') {
                last.thinkingSteps = [...(last.thinkingSteps || []), { type: 'searching', message: `Searching ${data.source}`, done: true }]
              } else if (data.event === 'token') {
                last.content = accumulated
              } else if (data.event === 'sources') {
                last.sources = data.sources
              } else if (data.event === 'done') {
                last.isStreaming = false
                if (!currentChatId && data.conversation_id) {
                  setCurrentChatId(data.conversation_id)
                  loadConversations()
                }
              }
              return u
            })
          } catch {}
        }
      }
    } catch {
      toast.error('Failed to send message')
      setMessages(prev => {
        const u = [...prev]
        const last = u[u.length - 1]
        if (last && last.role === 'assistant') {
          last.isStreaming = false
          last.isError = true
          last.content = 'Sorry, something went wrong. Please try again.'
        }
        return u
      })
    } finally {
      setIsStreaming(false)
    }
  }

  /* ─── Prompt picker helpers ─── */

  // Filter prompts against the query typed after the leading '/'
  const filteredPrompts = (() => {
    if (!pickerOpen) return []
    const q = pickerQuery.trim().toLowerCase()
    const base = allPrompts
    if (!q) return base.slice(0, 8)
    return base.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 8)
  })()

  const insertPrompt = async (p: PromptItem) => {
    setInput(p.body)
    setPickerOpen(false)
    setPickerQuery('')
    setPickerIndex(0)
    // Fire and forget — counts help us surface popular prompts later
    promptsApi.recordUse(p.id).catch(() => {})
    setTimeout(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      const end = el.value.length
      el.setSelectionRange(end, end)
    }, 0)
  }

  // Open picker when the entire input becomes exactly '/…'
  const handleInputChange = (val: string) => {
    setInput(val)
    if (val.startsWith('/') && !val.includes('\n')) {
      setPickerOpen(true)
      setPickerQuery(val.slice(1))
      setPickerIndex(0)
    } else if (pickerOpen) {
      setPickerOpen(false)
      setPickerQuery('')
    }
  }

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (pickerOpen && filteredPrompts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPickerIndex(i => (i + 1) % filteredPrompts.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPickerIndex(i => (i - 1 + filteredPrompts.length) % filteredPrompts.length)
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        insertPrompt(filteredPrompts[pickerIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setPickerOpen(false)
        setPickerQuery('')
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        insertPrompt(filteredPrompts[pickerIndex])
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const currentChat = chats.find(c => c.id === currentChatId)
  const showEmpty = messages.length === 0

  return (
    <>
      <style>{`
        .chat-prose { font-size: 14.5px; line-height: 1.75; color: var(--text-primary); }
        .chat-prose p.chat-p { margin-bottom: 1em; color: var(--text-primary); }
        .chat-prose p.chat-p:last-child { margin-bottom: 0; }
        .chat-prose strong { color: var(--text-primary); font-weight: 600; }
        .chat-prose em { font-style: italic; color: var(--text-secondary); }
        .chat-prose h1.chat-h1 { font-size: 19px; font-weight: 600; margin: 1em 0 0.5em; letter-spacing: -0.015em; color: var(--text-primary); }
        .chat-prose h2.chat-h2 { font-size: 16px; font-weight: 600; margin: 1em 0 0.5em; letter-spacing: -0.01em; color: var(--text-primary); }
        .chat-prose h3.chat-h3 { font-size: 14.5px; font-weight: 600; margin: 1em 0 0.5em; color: var(--text-primary); }
        .chat-prose ul.chat-ul { margin: 0 0 1em; padding-left: 22px; }
        .chat-prose li.chat-li { margin-bottom: 4px; color: var(--text-primary); list-style-type: disc; }
        .chat-prose blockquote.chat-bq { border-left: 3px solid var(--brand); padding: 2px 0 2px 14px; margin: 12px 0; color: var(--text-secondary); font-style: italic; }
        .chat-prose hr.chat-hr { border: none; border-top: 1px solid var(--border-subtle); margin: 20px 0; }
        .chat-prose code.chat-inline-code { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; background: var(--bg-raised); border: 1px solid var(--border-subtle); padding: 1px 6px; border-radius: 4px; color: var(--brand-text); }
        .chat-prose pre.chat-code-block { background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden; margin: 14px 0; }
        .chat-prose pre .chat-code-lang { background: var(--bg-surface); padding: 6px 14px; font-size: 10.5px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 500; border-bottom: 1px solid var(--border-subtle); letter-spacing: 0.05em; }
        .chat-prose pre code { display: block; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; overflow-x: auto; color: var(--text-primary); line-height: 1.6; }
        .dot-bounce { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-tertiary); animation: dot-bounce 1s ease-in-out infinite; }
        @keyframes dot-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-4px); opacity: 1; } }
        .chat-sidebar-item:hover .chat-sidebar-item-actions { opacity: 1; }
      `}</style>

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 60px)',
        margin: '-32px',
        background: 'var(--bg-base)',
      }}>

        {/* ─── Sidebar ─── */}
        <aside style={{
          width: sidebarOpen ? 260 : 0,
          borderRight: sidebarOpen ? '1px solid var(--border-subtle)' : 'none',
          background: 'var(--bg-subtle)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 220ms cubic-bezier(.16,1,.3,1)',
          flexShrink: 0,
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => { setCurrentChatId(null); setMessages([]); inputRef.current?.focus() }}
            >
              <Plus size={13} /> New chat
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {chats.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                No conversations yet
              </div>
            ) : (
              <>
                <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recent
                </div>
                {chats.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCurrentChatId(c.id); setMessages(c.messages) }}
                    className="chat-sidebar-item"
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: currentChatId === c.id ? 'var(--bg-raised)' : 'transparent',
                      border: 'none',
                      color: currentChatId === c.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 13,
                      marginBottom: 2,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background var(--t-fast)',
                      fontWeight: currentChatId === c.id ? 500 : 400,
                      letterSpacing: '-0.005em',
                    }}
                    onMouseEnter={e => { if (currentChatId !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                    onMouseLeave={e => { if (currentChatId !== c.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <MessageSquare size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title || 'Untitled'}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Sidebar footer */}
          <div style={{
            padding: 12,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 11, color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-base)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)',
            }}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </span>
          </div>
        </aside>

        {/* ─── Main chat area ─── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

          {/* Thin header */}
          <header style={{
            height: 48, flexShrink: 0,
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', padding: '0 16px',
            gap: 10,
          }}>
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="btn btn-ghost"
              style={{ width: 30, height: 30, padding: 0 }}
              title="Toggle sidebar"
            >
              <PanelLeftClose size={15} style={{ color: 'var(--text-tertiary)' }} />
            </button>
            <div style={{
              fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentChat?.title || 'New chat'}
            </div>
          </header>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {showEmpty ? (
              <div style={{
                height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '24px',
              }}>
                <div style={{ maxWidth: 720, width: '100%', textAlign: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20,
                    boxShadow: '0 6px 24px rgba(245,158,11,0.3)',
                  }}>
                    <Sparkles size={24} style={{ color: '#0a0a0f' }} />
                  </div>
                  <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: 8 }}>
                    How can I help today?
                  </h1>
                  <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 32 }}>
                    Ask anything about your connected sources — code, docs, tickets, chats.
                  </p>

                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10,
                    maxWidth: 600, margin: '0 auto',
                  }}>
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(s.text)}
                        className="surface"
                        style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'var(--bg-surface)',
                        }}
                      >
                        <s.icon size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, letterSpacing: '-0.005em' }}>
                          {s.text}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {messages.map(m => (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    onCopy={(c, id) => { navigator.clipboard.writeText(c); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) }}
                    copiedId={copiedId}
                  />
                ))}
                <div ref={bottomRef} style={{ height: 20 }} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ padding: '16px 24px 20px', flexShrink: 0 }}>
            <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
              <PromptPicker
                open={pickerOpen}
                prompts={filteredPrompts}
                activeIndex={pickerIndex}
                onHover={setPickerIndex}
                onSelect={insertPrompt}
              />
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 14,
                transition: 'border-color var(--t-fast)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand-border)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={allPrompts.length > 0 ? 'Message ContextOS… (type / to pick a prompt)' : 'Message ContextOS…'}
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'none', border: 'none', outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 14.5,
                    padding: '6px 4px',
                    resize: 'none',
                    minHeight: 24,
                    maxHeight: 200,
                    lineHeight: 1.55,
                    fontFamily: 'inherit',
                  }}
                  disabled={isStreaming}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isStreaming}
                  style={{
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: input.trim() && !isStreaming ? 'var(--brand)' : 'var(--bg-raised)',
                    color: input.trim() && !isStreaming ? '#0a0a0f' : 'var(--text-disabled)',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                    transition: 'all var(--t-fast)',
                    flexShrink: 0,
                  }}
                >
                  {isStreaming ? <Loader2 size={15} className="anim-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
                </button>
              </div>
              <div style={{
                marginTop: 8,
                fontSize: 11, color: 'var(--text-tertiary)',
                textAlign: 'center',
              }}>
                ContextOS can make mistakes. Verify important information.
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

/* ─── Prompt picker popover ────────────────────────────── */

function PromptPicker({
  open, prompts, activeIndex, onHover, onSelect,
}: {
  open: boolean
  prompts: PromptItem[]
  activeIndex: number
  onHover: (i: number) => void
  onSelect: (p: PromptItem) => void
}) {
  if (!open) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: 0, right: 0,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-base)',
      borderRadius: 12,
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      zIndex: 20,
      maxHeight: 320,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: 'var(--text-tertiary)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={11} style={{ color: '#fbbf24' }} /> Prompts
        </span>
        <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
          ↑↓ navigate · enter to insert · esc
        </span>
      </div>

      {prompts.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          No prompts match. <br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>Save one from the Prompts page to reuse it here.</span>
        </div>
      ) : (
        <div style={{ overflowY: 'auto' }}>
          {prompts.map((p, i) => (
            <button
              key={p.id}
              onMouseEnter={() => onHover(i)}
              onMouseDown={e => { e.preventDefault(); onSelect(p) }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '9px 12px', border: 'none', cursor: 'pointer',
                background: i === activeIndex ? 'rgba(245,158,11,0.08)' : 'transparent',
                borderLeft: i === activeIndex ? '2px solid #fbbf24' : '2px solid transparent',
                display: 'flex', flexDirection: 'column', gap: 2,
                borderBottom: i < prompts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                transition: 'background 0.08s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: i === activeIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.title}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 999,
                  background: p.scope === 'team' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                  color: p.scope === 'team' ? '#60a5fa' : 'var(--text-tertiary)',
                  border: p.scope === 'team' ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-subtle)',
                  flexShrink: 0,
                }}>
                  {p.scope}
                </span>
              </div>
              {p.description && (
                <span style={{
                  fontSize: 11, color: 'var(--text-tertiary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
