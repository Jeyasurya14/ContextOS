'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Plus, Copy, CheckCheck,
  Sparkles, Database, Brain, AlertCircle, ExternalLink, Hash, CornerDownLeft,
  ChevronRight, Terminal, History, Maximize2, Layers, Globe
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

  html = html.replace(/^[-*] (.+)$/gm, '<li class="chat-li">$1</li>')
  html = html.replace(/(<li class="chat-li">[\s\S]+?<\/li>(?:\n|$))+/g, (m) => `<ul class="chat-ul">${m}</ul>`)

  html = html.replace(/\n\n+/g, '\n\n')
  html = html.split('\n\n').map(block => {
    if (block.match(/^<(h[1-3]|ul|pre|blockquote|hr)/)) return block
    if (!block.trim()) return ''
    return `<p class="chat-p">${block.replace(/\n/g, '<br/>')}</p>`
  }).join('')

  return html
}

/* ─── Industrial Message Component ─── */
function IndustrialMessage({ msg, onCopy, copiedId }: { msg: Message; onCopy: (c: string, id: number) => void; copiedId: number | null }) {
  const isUser = msg.role === 'user'

  return (
    <div style={{ 
      padding: '20px 24px', 
      borderBottom: '1px solid var(--border-subtle)',
      background: isUser ? 'var(--bg-subtle)' : 'var(--bg-base)',
      display: 'flex', gap: 20
    }}>
      <div style={{ width: 32, height: 32, flexShrink: 0, marginTop: 2 }}>
        {isUser ? (
           <div style={{ width: '100%', height: '100%', borderRadius: 'var(--r-md)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-base)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>U</div>
        ) : (
           <div style={{ width: '100%', height: '100%', borderRadius: 'var(--r-md)', background: 'var(--brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}><Brain size={16} /></div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
           <span style={{ fontSize: 12, fontWeight: 700, color: isUser ? 'var(--text-secondary)' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isUser ? 'Client Request' : 'Context-Aware Analysis'}
           </span>
           <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>• {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'Realtime'}</span>
        </div>

        {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
           <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-sm)', padding: '12px', marginBottom: 16 }}>
              {msg.thinkingSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: step.done ? 'var(--text-tertiary)' : 'var(--text-secondary)', marginBottom: 4 }}>
                   {step.done ? <CheckCheck size={12} style={{ color: 'var(--success-text)' }} /> : <Terminal size={12} className="anim-spin" />}
                   <span>{step.message}</span>
                </div>
              ))}
           </div>
        )}

        <div className="chat-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />

        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {msg.sources.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--bg-raised)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--text-secondary)' }}>
                 <Database size={10} /> {s.type.split('_')[0]}
              </div>
            ))}
          </div>
        )}

        {!msg.isStreaming && msg.content && (
           <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => onCopy(msg.content, msg.id)}
                style={{ fontSize: 11, color: copiedId === msg.id ? 'var(--success-text)' : 'var(--text-tertiary)' }}
              >
                {copiedId === msg.id ? <CheckCheck size={12} /> : <Copy size={12} />} {copiedId === msg.id ? 'Copied' : 'Copy'}
              </button>
           </div>
        )}
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

  const chatsRef = useRef<Chat[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: Chat[] = JSON.parse(raw)
        if (parsed.length > 0) {
          setChats(parsed); chatsRef.current = parsed
          setCurrentChatId(parsed[0].id)
          setMessages(parsed[0].messages || [])
        }
      }
    } catch {}
  }, [])

  const saveMessages = useCallback((msgs: Message[], chatId: string) => {
    const updated = chatsRef.current.map(c => c.id === chatId ? { ...c, messages: msgs, updatedAt: new Date() } : c)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setChats(updated); chatsRef.current = updated
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return
    const text = input.trim(); setInput('')
    
    let chatId = currentChatId
    if (!chatId) {
      chatId = Date.now().toString()
      const newChat = { id: chatId, title: text.slice(0, 30), messages: [], createdAt: new Date(), updatedAt: new Date() }
      const updated = [newChat, ...chats]
      setChats(updated); chatsRef.current = updated; setCurrentChatId(chatId)
    }

    const userMsg: Message = { id: Date.now(), role: 'user', content: text, timestamp: new Date() }
    const assistantMsg: Message = { id: Date.now() + 1, role: 'assistant', content: '', isStreaming: true, thinkingSteps: [], timestamp: new Date() }
    
    const newMsgs = [...messages, userMsg, assistantMsg]
    setMessages(newMsgs); setIsStreaming(true)

    const token = useAuthStore.getState().token
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const resp = await fetch(`${apiUrl}/api/v1/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ question: text })
      })
      if (!resp.ok) throw new Error()
      
      const reader = resp.body?.getReader()
      if (!reader) throw new Error()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.event === 'token') accumulated += data.content
          setMessages(prev => {
            const u = [...prev]
            if (data.event === 'thinking') u[u.length-1].thinkingSteps = [...(u[u.length-1].thinkingSteps || []), { type: 'thinking', message: data.message }]
            else if (data.event === 'token') u[u.length - 1].content = accumulated
            else if (data.event === 'done') u[u.length - 1].isStreaming = false
            return u
          })
        }
      }
      saveMessages(newMsgs, chatId)
    } catch {
       toast.error('Query pipeline failed.')
    } finally { setIsStreaming(false) }
  }

  return (
    <>
      <style>{`
        .chat-prose { font-size: 14px; line-height: 1.6; color: var(--text-secondary); }
        .chat-prose p { margin-bottom: 1em; }
        .chat-prose strong { color: var(--text-primary); font-weight: 600; }
        .chat-prose pre.chat-code-block { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: var(--r-md); overflow: hidden; margin: 16px 0; }
        .chat-prose pre .chat-code-lang { background: var(--bg-subtle); padding: 4px 12px; font-size: 10px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 700; border-bottom: 1px solid var(--border-subtle); }
        .chat-prose pre code { display: block; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; overflow-x: auto; color: var(--text-primary); }
      `}</style>
      
      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 104px)', /* 52px header + 52px (24*2) padding offset approx */
        border: '1px solid var(--border-subtle)', 
        borderRadius: 'var(--r-lg)', 
        background: 'var(--bg-base)', 
        overflow: 'hidden' 
      }}>
        
        {/* Thread Sidebar (Industrial Style) */}
        <div style={{ width: 280, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-primary btn-full btn-sm" style={{ height: 32 }} onClick={() => { setCurrentChatId(null); setMessages([]) }}>
                 <Plus size={14} /> New Analysis
              </button>
           </div>
           <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>Recent Streams</div>
              {chats.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => { setCurrentChatId(c.id); setMessages(c.messages) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 'var(--r-md)',
                    background: currentChatId === c.id ? 'var(--bg-surface)' : 'transparent',
                    border: currentChatId === c.id ? '1px solid var(--border-base)' : '1px solid transparent',
                    color: currentChatId === c.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '12px', marginBottom: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    transition: 'all var(--t-fast)'
                  }}
                >
                   <History size={13} style={{ opacity: 0.5 }} />
                   <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                </button>
              ))}
           </div>
        </div>

        {/* Workspace Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
           
           {/* Dynamic Header */}
           <div style={{ height: 48, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px' }}>
                 <Layers size={14} style={{ color: 'var(--brand)' }} />
                 <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{currentChatId ? chats.find(c => c.id === currentChatId)?.title : 'New Intelligence Session'}</span>
              </div>
           </div>

           {/* Messages Scroll Area (Expansive) */}
           <div style={{ flex: 1, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, opacity: 0.5 }}>
                   <Database size={48} style={{ marginBottom: 20 }} />
                   <div style={{ fontSize: 14, fontWeight: 600 }}>Ready to parse global context.</div>
                   <div style={{ fontSize: 12 }}>Input your query to begin semantic analysis.</div>
                </div>
              ) : (
                messages.map(m => (
                  <IndustrialMessage key={m.id} msg={m} onCopy={(c, id) => { navigator.clipboard.writeText(c); setCopiedId(id); setTimeout(()=>setCopiedId(null), 2000) }} copiedId={copiedId} />
                ))
              )}
              <div ref={bottomRef} />
           </div>

           {/* Precision Input Area */}
           <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', gap: 12, background: 'var(--bg-base)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-md)', padding: 4 }}>
                 <textarea 
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                   placeholder="Query context pipelines... (Cmd + Enter)"
                   style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, padding: '12px', resize: 'none', outline: 'none', minHeight: 44 }}
                 />
                 <button 
                   className="btn btn-primary" 
                   onClick={handleSend}
                   disabled={!input.trim() || isStreaming}
                   style={{ height: 44, width: 44, padding: 0, alignSelf: 'flex-end', borderRadius: 'var(--r-sm)' }}
                >
                    <CornerDownLeft size={16} />
                 </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                 <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={10} /> Vector Search Active</div>
                    <div style={{ fontSize: 10, color: 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 4 }}><Maximize2 size={10} /> Deep Parse Enabled</div>
                 </div>
                 <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>GPT-4o Context Aware</div>
              </div>
           </div>

        </div>

      </div>
    </>
  )
}