'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Edit3, Copy, CheckCheck,
  ArrowUp, Sparkles, Database, Brain, Loader2, ChevronDown,
  AlertCircle, ExternalLink, Layers
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
  "Find bugs mentioned in Slack",
]

const STORAGE_KEY = 'contextos_chats_v2'

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

  // Paragraphs — double newlines
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
  github: '#6e40c9',
  notion: '#a0a0a0',
  slack: '#e01e5a',
  linear: '#5b5fc7',
  google: '#4285f4',
  google_drive: '#0f9d58',
}

/* ─── Source chip ────────────────────────────────────── */
function SourceChip({ source }: { source: Source }) {
  const type = (source.type || '').split('_')[0]
  const color = PROVIDER_COLORS[source.type?.toLowerCase()] || '#6b7280'
  return (
    <a
      href={source.url || '#'}
      target={source.url ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-opacity hover:opacity-75"
      style={{ background: `${color}1a`, border: `1px solid ${color}40`, color }}
    >
      <span className="capitalize">{type}</span>
      {source.url && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
    </a>
  )
}

/* ─── Thinking dots ──────────────────────────────────── */
function Dots() {
  return (
    <span className="inline-flex gap-1 ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: '#d97706',
            opacity: 0.5,
            animation: `ctxBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

/* ─── Status panel ───────────────────────────────────── */
function StatusPanel({ steps }: { steps: ThinkingStep[] }) {
  return (
    <div className="mb-3 space-y-1.5">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1 && !step.done
        const isDone = step.done || (!isLast && i < steps.length - 1)
        return (
          <div
            key={i}
            className="flex items-center gap-2 text-xs"
            style={{
              color: isDone ? '#3f3f46' : isLast ? '#d97706' : '#52525b',
              animation: isLast ? 'ctxFadeIn 0.2s ease-out' : 'none',
            }}
          >
            <span className="flex-shrink-0">
              {isDone
                ? <CheckCheck className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                : step.type === 'thinking'
                  ? <Brain className="w-3.5 h-3.5" />
                  : <Database className="w-3.5 h-3.5" />
              }
            </span>
            <span className={isDone ? 'line-through opacity-40' : isLast ? 'font-medium' : 'opacity-50'}>
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

/* ─── ContextOS mini SVG logo ────────────────────────── */
function CtxLogo({ size = 20, id = 'logo' }: { size?: number; id?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id={`cg-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`hg-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke={`url(#cg-${id})`} strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="17" cy="32" r="4" fill="#d97706" />
      <g transform="translate(37,32)">
        <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke={`url(#hg-${id})`} strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="-7" y1="-4" x2="7" y2="-4" stroke={`url(#hg-${id})`} strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="0" x2="7" y2="0" stroke={`url(#hg-${id})`} strokeWidth="2" strokeLinecap="round" />
        <line x1="-7" y1="4" x2="7" y2="4" stroke={`url(#hg-${id})`} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/* ─── Message bubble ─────────────────────────────────── */
function MessageBubble({
  msg, onCopy, copiedId,
}: { msg: Message; onCopy: (c: string, id: number) => void; copiedId: number | null }) {
  const isUser = msg.role === 'user'
  const ts = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : ''

  if (isUser) {
    return (
      <div className="flex justify-end mb-5 group" style={{ animation: 'ctxFadeIn 0.2s ease-out' }}>
        <div className="max-w-[78%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-white"
            style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}
          >
            {msg.content}
          </div>
          <div className="flex justify-end items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-dark-600">{ts}</span>
            <button onClick={() => onCopy(msg.content, msg.id)} className="text-dark-600 hover:text-dark-400 transition-colors">
              {copiedId === msg.id ? <CheckCheck className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-8 group" style={{ animation: 'ctxFadeIn 0.2s ease-out' }}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
        <CtxLogo size={18} id={`msg-${msg.id}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-white">ContextOS</span>
          <span className="text-[10px] text-dark-600">{ts}</span>
        </div>

        {/* Status steps */}
        {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
          <StatusPanel steps={msg.thinkingSteps} />
        )}

        {/* Error */}
        {msg.isError && (
          <div className="flex items-start gap-2 p-3 rounded-xl text-sm mb-2"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#ef4444' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{msg.content}</span>
          </div>
        )}

        {/* Content */}
        {!msg.isError && msg.content && (
          <div className="chat-prose text-sm text-dark-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        )}

        {/* Streaming indicator when no content yet */}
        {msg.isStreaming && !msg.content && !msg.thinkingSteps?.length && (
          <div className="flex items-center gap-1">
            {[0,1,2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-dark-700"
                style={{ animation: `ctxBounce 1.2s ease-in-out ${i*0.18}s infinite` }} />
            ))}
          </div>
        )}

        {/* Streaming cursor */}
        {msg.isStreaming && msg.content && (
          <span className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
            style={{ background: '#d97706', verticalAlign: 'middle' }} />
        )}

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-dark-600 self-center mr-1">Sources:</span>
            {msg.sources.map((s, i) => <SourceChip key={i} source={s} />)}
          </div>
        )}

        {/* Actions */}
        {!msg.isStreaming && msg.content && !msg.isError && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCopy(msg.content, msg.id)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-dark-500 hover:text-dark-200 hover:bg-dark-800/50 rounded-lg transition-all"
            >
              {copiedId === msg.id
                ? <><CheckCheck className="w-3 h-3 text-success" /><span className="text-success">Copied!</span></>
                : <><Copy className="w-3 h-3" /><span>Copy</span></>
              }
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
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}>
        <CtxLogo size={36} id="empty" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">How can I help?</h2>
      <p className="text-dark-400 text-sm max-w-sm mb-10 leading-relaxed">
        Ask me anything about your project — commits, docs, Slack threads, or general engineering questions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTED.map((q) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            className="text-left px-4 py-3 rounded-xl text-sm text-dark-300 hover:text-white transition-all"
            style={{ background: 'rgba(217,119,6,0.03)', border: '1px solid rgba(217,119,6,0.08)' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(217,119,6,0.07)'
              el.style.borderColor = 'rgba(217,119,6,0.2)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(217,119,6,0.03)'
              el.style.borderColor = 'rgba(217,119,6,0.08)'
            }}
          >
            <span className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 text-brand flex-shrink-0" />
              {q}
            </span>
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
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [showScrollDown, setShowScrollDown] = useState(false)

  // Use refs to always have latest values in async callbacks
  const chatsRef = useRef<Chat[]>([])
  const currentChatIdRef = useRef<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  /* ── Keep refs in sync ── */
  useEffect(() => { chatsRef.current = chats }, [chats])
  useEffect(() => { currentChatIdRef.current = currentChatId }, [currentChatId])

  /* ── Load integrations ── */
  useEffect(() => {
    integrationsApi.getAll()
      .then(({ data }) => setIntegrations(data || []))
      .catch(() => {})
      .finally(() => setLoadingIntegrations(false))
  }, [])

  /* ── Load history from localStorage ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: Chat[] = JSON.parse(raw)
        if (parsed.length > 0) {
          setChats(parsed)
          chatsRef.current = parsed
          setCurrentChatId(parsed[0].id)
          currentChatIdRef.current = parsed[0].id
          setMessages(parsed[0].messages || [])
        }
      }
    } catch {}
  }, [])

  /* ── Persist chats ── */
  const persistChats = useCallback((updated: Chat[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    setChats(updated)
    chatsRef.current = updated
  }, [])

  /* ── Save messages into current chat ── */
  const saveMessages = useCallback((msgs: Message[], chatId: string) => {
    const current = chatsRef.current
    const title = msgs.length > 0
      ? msgs[0].content.slice(0, 50) + (msgs[0].content.length > 50 ? '…' : '')
      : 'New conversation'
    const updated = current.map(c =>
      c.id === chatId ? { ...c, messages: msgs, title, updatedAt: new Date() } : c
    )
    persistChats(updated)
  }, [persistChats])

  /* ── New chat ── */
  const createNewChat = useCallback(() => {
    const chat: Chat = {
      id: Date.now().toString(),
      title: 'New conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const updated = [chat, ...chatsRef.current]
    persistChats(updated)
    setCurrentChatId(chat.id)
    currentChatIdRef.current = chat.id
    setMessages([])
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [persistChats])

  /* ── Select chat ── */
  const selectChat = (chat: Chat) => {
    setCurrentChatId(chat.id)
    currentChatIdRef.current = chat.id
    setMessages(chat.messages || [])
  }

  /* ── Delete chat ── */
  const deleteChat = (id: string) => {
    const updated = chatsRef.current.filter(c => c.id !== id)
    persistChats(updated)
    if (currentChatIdRef.current === id) {
      if (updated.length > 0) {
        setCurrentChatId(updated[0].id)
        currentChatIdRef.current = updated[0].id
        setMessages(updated[0].messages || [])
      } else {
        setCurrentChatId(null)
        currentChatIdRef.current = null
        setMessages([])
      }
    }
  }

  /* ── Rename chat ── */
  const renameChat = (id: string, title: string) => {
    if (!title.trim()) return
    const updated = chatsRef.current.map(c => c.id === id ? { ...c, title: title.trim() } : c)
    persistChats(updated)
    setEditingChatId(null)
  }

  /* ── Auto-scroll ── */
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 80)
  }

  /* ── Textarea resize ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  /* ── Copy ── */
  const handleCopy = async (content: string, id: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }

  /* ── Send ── */
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    // Ensure there's a chat to send to
    let chatId = currentChatIdRef.current
    if (!chatId) {
      const chat: Chat = {
        id: Date.now().toString(),
        title: 'New conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      persistChats([chat, ...chatsRef.current])
      chatId = chat.id
      setCurrentChatId(chat.id)
      currentChatIdRef.current = chat.id
    }

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    const assistantMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isStreaming: true,
      thinkingSteps: [],
      timestamp: new Date(),
    }

    const initialMsgs = [...messages, userMsg, assistantMsg]
    setMessages(initialMsgs)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsStreaming(true)

    // Save user message immediately
    saveMessages([...messages, userMsg], chatId)

    const token = useAuthStore.getState().token
    if (!token) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Your session has expired. Please refresh the page or log in again.',
        isStreaming: false,
        isError: true,
        timestamp: new Date(),
      }])
      setIsStreaming(false)
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const resp = await fetch(`${apiUrl}/api/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: text }),
      })

      if (resp.status === 401) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const reader = resp.body?.getReader()
      if (!reader) throw new Error('No stream')

      let accumulated = ''
      const decoder = new TextDecoder()
      let stepsLog: ThinkingStep[] = []

      const updateLast = (patch: Partial<Message>) => {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], ...patch }
          return updated
        })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.event === 'thinking') {
              stepsLog = [...stepsLog, { type: 'thinking', message: data.message || 'Thinking…' }]
              updateLast({ thinkingSteps: stepsLog })
            } else if (data.event === 'searching') {
              stepsLog = [...stepsLog, {
                type: 'searching',
                message: `Searching ${data.source || 'context'}`,
                source: data.source,
                count: data.count,
              }]
              updateLast({ thinkingSteps: stepsLog })
            } else if (data.event === 'token') {
              accumulated += data.content
              // Mark all steps done once tokens arrive
              if (stepsLog.some(s => !s.done)) {
                stepsLog = stepsLog.map(s => ({ ...s, done: true }))
              }
              updateLast({ content: accumulated, thinkingSteps: stepsLog })
            } else if (data.event === 'sources') {
              updateLast({ sources: data.sources })
            } else if (data.event === 'done') {
              updateLast({ isStreaming: false })
            } else if (data.event === 'error') {
              updateLast({
                content: data.message || 'Something went wrong.',
                isStreaming: false,
                isError: true,
              })
            }
          } catch {}
        }
      }

      // Final: persist full conversation
      setMessages(prev => {
        const final = prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, isStreaming: false } : m
        )
        if (chatId) saveMessages(final, chatId)
        return final
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Failed to connect. Make sure the backend is running.',
          isStreaming: false,
          isError: true,
        }
        if (chatId) saveMessages(updated, chatId)
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, saveMessages, persistChats])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const [chatSidebarOpen, setChatSidebarOpen] = useState(false)

  const connectedIntegrations = integrations.filter(i => i.is_active)
  const currentChat = chats.find(c => c.id === currentChatId)

  return (
    <>
      <style>{`
        @keyframes ctxFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ctxBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }

        /* ── Prose ── */
        .chat-prose { line-height: 1.75; }
        .chat-prose .chat-h1 { font-size: 1.2rem; font-weight: 700; color: #fff; margin: 1.2em 0 0.5em; }
        .chat-prose .chat-h2 { font-size: 1.05rem; font-weight: 700; color: #e4e4e7; margin: 1em 0 0.4em; }
        .chat-prose .chat-h3 { font-size: 0.95rem; font-weight: 600; color: #d4d4d8; margin: 0.8em 0 0.3em; }
        .chat-prose .chat-p  { margin-bottom: 0.75em; }
        .chat-prose .chat-p:last-child { margin-bottom: 0; }
        .chat-prose .chat-ul { padding-left: 1.25rem; margin: 0.5em 0; list-style-type: disc; }
        .chat-prose .chat-li { margin: 0.3em 0; }
        .chat-prose .chat-bq {
          border-left: 3px solid rgba(217,119,6,0.5);
          padding-left: 0.75rem;
          margin: 0.75em 0;
          color: #71717a;
          font-style: italic;
        }
        .chat-prose .chat-hr { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 1em 0; }
        .chat-prose .chat-code-block {
          margin: 0.75em 0;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .chat-prose .chat-code-lang {
          padding: 0.35rem 0.9rem;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #52525b;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
        }
        .chat-prose .chat-code-block code {
          display: block;
          padding: 0.9rem;
          font-size: 0.8rem;
          line-height: 1.65;
          color: #e4e4e7;
          font-family: 'JetBrains Mono','Fira Code','Cascadia Code',monospace;
          white-space: pre;
          overflow-x: auto;
        }
        .chat-prose .chat-inline-code {
          background: rgba(217,119,6,0.1);
          border: 1px solid rgba(217,119,6,0.2);
          color: #f59e0b;
          padding: 0.1em 0.35em;
          border-radius: 4px;
          font-size: 0.82em;
          font-family: 'JetBrains Mono',monospace;
        }
        /* sidebar scrollbar */
        .ctx-sidebar::-webkit-scrollbar { width: 3px; }
        .ctx-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        /* messages scrollbar */
        .ctx-messages::-webkit-scrollbar { width: 4px; }
        .ctx-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
      `}</style>

      <div className="flex overflow-hidden" style={{ height: '100dvh', background: '#09090b' }}>

        {/* ══ Mobile overlay ══ */}
        {chatSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setChatSidebarOpen(false)} />
        )}

        {/* ══ Chat Sidebar ══ */}
        <div
          className={`flex-shrink-0 flex flex-col border-r z-50 transition-transform duration-250
            fixed lg:relative inset-y-0 left-0 w-[220px]
            ${chatSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(9,9,11,0.98)' }}
        >
          {/* New chat button */}
          <div className="p-3 pb-2">
            <button
              onClick={createNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
              style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.15)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.07)')}
            >
              <Plus className="w-4 h-4 text-brand" />
              New conversation
            </button>
          </div>

          {/* Connected badge */}
          {connectedIntegrations.length > 0 && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.12)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-[10px] text-success font-medium">
                  {connectedIntegrations.length} source{connectedIntegrations.length !== 1 ? 's' : ''} active
                </span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mx-3 mb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto ctx-sidebar px-2 pb-3">
            {chats.length === 0 && (
              <p className="text-[11px] text-dark-600 text-center py-6">No conversations yet</p>
            )}
            {chats.map(chat => {
              const isActive = currentChatId === chat.id
              return (
                <div
                  key={chat.id}
                  onClick={() => selectChat(chat)}
                  className="group relative rounded-xl px-3 py-2.5 cursor-pointer transition-all mb-px"
                  style={isActive
                    ? { background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.18)' }
                    : { border: '1px solid transparent' }
                  }
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = ''
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onBlur={() => renameChat(chat.id, editingTitle)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renameChat(chat.id, editingTitle)
                            if (e.key === 'Escape') setEditingChatId(null)
                          }}
                          className="w-full bg-transparent text-white text-xs outline-none border-b"
                          style={{ borderColor: 'rgba(217,119,6,0.5)' }}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-dark-300'}`}>
                          {chat.title}
                        </p>
                      )}
                      <p className="text-[10px] text-dark-600 mt-0.5">
                        {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingChatId(chat.id); setEditingTitle(chat.title) }}
                        className="p-1 rounded text-dark-600 hover:text-dark-300 transition-colors"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                        className="p-1 rounded text-dark-600 hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══ Main ══ */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile: show sidebar toggle */}
              <button
                className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={() => setChatSidebarOpen(true)}
              >
                <Layers className="w-3.5 h-3.5 text-dark-400" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-white truncate">
                  {currentChat?.title || 'ContextOS AI'}
                </h1>
                <p className="text-[11px] mt-0.5 hidden sm:block" style={{ color: '#3f3f46' }}>
                  {loadingIntegrations ? 'Loading…'
                    : connectedIntegrations.length === 0
                      ? 'Connect integrations to search your context'
                      : connectedIntegrations.map(i => i.provider.replace('_', ' ')).join(', ')
                  }
                </p>
              </div>
            </div>

            {/* Provider pills - hidden on xs */}
            <div className="hidden sm:flex items-center gap-1.5">
              {connectedIntegrations.slice(0, 3).map(i => {
                const color = PROVIDER_COLORS[i.provider] || '#6b7280'
                return (
                  <span key={i.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                    style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                    {i.provider.replace('_', ' ')}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto ctx-messages"
          >
            {messages.length === 0
              ? <EmptyState onSuggest={q => { setInput(q); setTimeout(() => handleSend(), 50) }} />
              : (
                <div className="max-w-3xl mx-auto px-6 py-8">
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      onCopy={handleCopy}
                      copiedId={copiedId}
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
              )
            }

            {showScrollDown && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-28 right-8 p-2 rounded-full shadow-lg transition-all z-10"
                style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ChevronDown className="w-4 h-4 text-dark-300" />
              </button>
            )}
          </div>

          {/* Input */}
          <div
            className="flex-shrink-0 px-6 py-4 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(9,9,11,0.97)', backdropFilter: 'blur(12px)' }}
          >
            <div className="max-w-3xl mx-auto">
              <div
                id="chat-input-box"
                className="relative rounded-2xl transition-all duration-150"
                style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocusCapture={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(217,119,6,0.35)'
                  el.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.06)'
                }}
                onBlurCapture={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(255,255,255,0.08)'
                  el.style.boxShadow = 'none'
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your project…"
                  rows={1}
                  disabled={isStreaming}
                  className="w-full bg-transparent px-5 pt-4 pb-12 text-sm text-white placeholder-dark-600 resize-none focus:outline-none leading-relaxed"
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />

                {/* Bottom bar */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="pointer-events-auto">
                    {isStreaming ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-dark-500">
                        <span className="flex gap-1">
                          {[0,1,2].map(i => (
                            <span key={i} className="w-1 h-1 rounded-full"
                              style={{ background: '#d97706', animation: `ctxBounce 1.2s ease-in-out ${i*0.15}s infinite` }} />
                          ))}
                        </span>
                        <span>Generating…</span>
                      </div>
                    ) : (
                      <span className="text-[10px]" style={{ color: '#27272a' }}>
                        Enter ↵ to send · Shift+Enter for newline
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={isStreaming || !input.trim()}
                    className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
                    style={{
                      background: input.trim() && !isStreaming
                        ? 'linear-gradient(135deg, #d97706, #b45309)'
                        : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {isStreaming
                      ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                      : <ArrowUp className="w-4 h-4 text-white" />
                    }
                  </button>
                </div>
              </div>

              <p className="text-center text-[10px] mt-2" style={{ color: '#27272a' }}>
                ContextOS AI · Responses grounded in your connected sources
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}