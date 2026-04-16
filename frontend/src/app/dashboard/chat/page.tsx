'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Plus, Copy, CheckCheck,
  Sparkles, Database, Brain, AlertCircle, ExternalLink, Hash, CornerDownLeft,
  ChevronRight, Terminal, History, Maximize2, Layers, Globe
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { integrationsApi, queryApi } from '@/lib/api'
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
      padding: '24px 28px', 
      borderBottom: '1px solid var(--border-subtle)',
      background: isUser ? 'var(--bg-subtle)' : 'var(--bg-base)',
      display: 'flex', gap: 16
    }}>
      <div style={{ width: 36, height: 36, flexShrink: 0, marginTop: 2 }}>
        {isUser ? (
           <div style={{ width: '100%', height: '100%', borderRadius: 'var(--r-md)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-base)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>U</div>
        ) : (
           <div style={{ width: '100%', height: '100%', borderRadius: 'var(--r-md)', background: 'var(--brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}><Brain size={18} /></div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
           <span style={{ fontSize: 12, fontWeight: 600, color: isUser ? 'var(--text-secondary)' : 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {isUser ? 'You' : 'Assistant'}
           </span>
           <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>• {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'now'}</span>
        </div>

        {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
           <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', padding: '14px', marginBottom: 16 }}>
              {msg.thinkingSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: step.done ? 'var(--text-tertiary)' : 'var(--text-secondary)', marginBottom: i < msg.thinkingSteps!.length - 1 ? 6 : 0 }}>
                   {step.done ? <CheckCheck size={13} style={{ color: 'var(--success-text)' }} /> : <Terminal size={13} className="anim-spin" />}
                   <span>{step.message}</span>
                </div>
              ))}
           </div>
        )}

        <div className="chat-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />

        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {msg.sources.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-md)', fontSize: 11, color: 'var(--text-secondary)' }}>
                 <Database size={11} /> {s.type.split('_')[0]}
              </div>
            ))}
          </div>
        )}

        {!msg.isStreaming && msg.content && (
           <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 14, display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => onCopy(msg.content, msg.id)}
                style={{ fontSize: 12, color: copiedId === msg.id ? 'var(--success-text)' : 'var(--text-tertiary)', height: '32px' }}
              >
                {copiedId === msg.id ? <CheckCheck size={13} /> : <Copy size={13} />} {copiedId === msg.id ? 'Copied' : 'Copy'}
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
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const res = await queryApi.listConversations()
      setChats(res.data.map((c: any) => ({
        id: c.id,
        title: c.title,
        messages: [], // messages will be fetched when selected
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at)
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
        timestamp: new Date(m.created_at)
      }))
      setMessages(mappedMsgs)
    } catch {
      toast.error('Failed to load transmission history.')
    }
  }

  useEffect(() => {
    if (currentChatId) {
       loadConversationDetails(currentChatId)
    }
  }, [currentChatId])

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
    
    setMessages(prev => [...prev, userMsg, assistantMsg]); setIsStreaming(true)

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
            if (data.event === 'token') {
              accumulated += data.content
            }
            
            setMessages(prev => {
              const u = [...prev]
              const last = u[u.length-1]
              if (!last || last.role !== 'assistant') return prev

              if (data.event === 'thinking') {
                last.thinkingSteps = [...(last.thinkingSteps || []), { type: 'thinking', message: data.message, done: true }]
              } else if (data.event === 'searching') {
                last.thinkingSteps = [...(last.thinkingSteps || []), { type: 'searching', message: `Searching ${data.source}...`, done: true }]
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
          } catch (e) {
            console.error('SSE parse error', e)
          }
        }
      }
    } catch {
       toast.error('Intelligence sync failed.')
    } finally { setIsStreaming(false) }
  }

  return (
    <>
      <style>{`
        .chat-prose { font-size: 14.5px; line-height: 1.7; color: var(--text-secondary); }
        .chat-prose p { margin-bottom: 1em; }
        .chat-prose strong { color: var(--text-primary); font-weight: 600; }
        .chat-prose pre.chat-code-block { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: var(--r-md); overflow: hidden; margin: 16px 0; }
        .chat-prose pre .chat-code-lang { background: var(--bg-subtle); padding: 6px 14px; font-size: 10px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 600; border-bottom: 1px solid var(--border-subtle); letter-spacing: 0.05em; }
        .chat-prose pre code { display: block; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; overflow-x: auto; color: var(--text-primary); line-height: 1.6; }
      `}</style>
      
      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 104px)', /* 52px header + 52px (24*2) padding offset approx */
        border: '1px solid var(--border-subtle)', 
        borderRadius: 'var(--r-lg)', 
        background: 'var(--bg-base)', 
        overflow: 'hidden' 
      }}>
        
        {/* Thread Sidebar */}
        <div style={{ width: 280, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-primary btn-full btn-sm" onClick={() => { setCurrentChatId(null); setMessages([]) }}>
                 <Plus size={14} /> New Chat
              </button>
           </div>
           <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 10, letterSpacing: '0.05em' }}>Conversations</div>
              {chats.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => { setCurrentChatId(c.id); setMessages(c.messages) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r-md)',
                    background: currentChatId === c.id ? 'var(--bg-surface)' : 'transparent',
                    border: '1px solid transparent',
                    color: currentChatId === c.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '13px', marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    transition: 'all var(--t-fast)', fontWeight: currentChatId === c.id ? 500 : 400
                  }}
                  className="hover:bg-[var(--bg-surface)]"
                >
                   <History size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
                   <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                </button>
              ))}
           </div>
        </div>

        {/* Workspace Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
           
           {/* Header */}
           <div style={{ height: 56, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <Layers size={16} style={{ color: 'var(--brand)' }} />
                 <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{currentChatId ? chats.find(c => c.id === currentChatId)?.title : 'New Conversation'}</span>
              </div>
           </div>

           {/* Messages */}
           <div style={{ flex: 1, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                   <Database size={56} style={{ marginBottom: 20, color: 'var(--text-disabled)' }} />
                   <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Start a conversation</div>
                   <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Ask anything about your connected sources</div>
                </div>
              ) : (
                messages.map(m => (
                  <IndustrialMessage key={m.id} msg={m} onCopy={(c, id) => { navigator.clipboard.writeText(c); setCopiedId(id); setTimeout(()=>setCopiedId(null), 2000) }} copiedId={copiedId} />
                ))
              )}
              <div ref={bottomRef} />
           </div>

           {/* Input Area */}
           <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', gap: 10, background: 'var(--bg-base)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-lg)', padding: 6 }}>
                 <textarea 
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                   placeholder="Ask anything..."
                   style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 14, padding: '12px 14px', resize: 'none', outline: 'none', minHeight: 48, lineHeight: 1.5 }}
                 />
                 <button 
                   className="btn btn-primary" 
                   onClick={handleSend}
                   disabled={!input.trim() || isStreaming}
                   style={{ height: 48, width: 48, padding: 0, alignSelf: 'flex-end', borderRadius: 'var(--r-md)' }}
                >
                    <CornerDownLeft size={18} />
                 </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                 <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Press Enter to send, Shift + Enter for new line</div>
                 <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>GPT-4o</div>
              </div>
           </div>

        </div>

      </div>
    </>
  )
}