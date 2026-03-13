// frontend/src/app/dashboard/chat/page.tsx
'use client'

import { useRef, useState, useEffect } from 'react'
import { Send, Loader2, AlertCircle, Plus, MessageSquare, Trash2, Edit3, Check, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { queryApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  thinkingSteps?: string[]
  sources?: any[]
  isStreaming?: boolean
  isError?: boolean
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const SUGGESTED_QUESTIONS = [
  '💻 What did I work on recently?',
  '🔧 Show me my latest commits',
  '📊 Summarize my GitHub activity',
  '🐛 What bugs did I fix?',
  '📝 What changes did I make today?',
  '🚀 What projects am I working on?',
]

export default function ChatPage() {
  const { toast } = useToast()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const { data } = await integrationsApi.getAll()
        setIntegrations(data || [])
      } catch (err) {
        console.error('Failed to load integrations:', err)
      } finally {
        setLoadingIntegrations(false)
      }
    }
    fetchIntegrations()
  }, [])

  useEffect(() => {
    // Load chats from localStorage
    const savedChats = localStorage.getItem('chatHistory')
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats)
      setChats(parsedChats)
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id)
        setMessages(parsedChats[0].messages)
      }
    }
  }, [])

  const saveChats = (updatedChats: Chat[]) => {
    localStorage.setItem('chatHistory', JSON.stringify(updatedChats))
    setChats(updatedChats)
  }

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const updatedChats = [newChat, ...chats]
    saveChats(updatedChats)
    setCurrentChatId(newChat.id)
    setMessages([])
  }

  const deleteChat = (chatId: string) => {
    const updatedChats = chats.filter(c => c.id !== chatId)
    saveChats(updatedChats)
    if (currentChatId === chatId) {
      if (updatedChats.length > 0) {
        setCurrentChatId(updatedChats[0].id)
        setMessages(updatedChats[0].messages)
      } else {
        setCurrentChatId(null)
        setMessages([])
      }
    }
  }

  const updateChatTitle = (chatId: string, newTitle: string) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle, updatedAt: new Date() } : chat
    )
    saveChats(updatedChats)
    setEditingChatId(null)
    setEditingTitle('')
  }

  const saveCurrentChat = (newMessages: Message[]) => {
    if (!currentChatId) return
    
    const updatedChats = chats.map(chat => {
      if (chat.id === currentChatId) {
        const title = newMessages.length > 0 
          ? newMessages[0].content.slice(0, 50) + (newMessages[0].content.length > 50 ? '...' : '')
          : 'New Chat'
        return { ...chat, messages: newMessages, title, updatedAt: new Date() }
      }
      return chat
    })
    saveChats(updatedChats)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    // Create new chat if none exists
    if (!currentChatId) {
      createNewChat()
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    }

    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }

    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    saveCurrentChat(newMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const response = await fetch('/api/v1/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({ question: userMessage.content }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      let accumulatedContent = ''
      const decoder = new TextDecoder()
      let thinkingSteps: string[] = []
      let sources: any[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.event === 'token') {
                accumulatedContent += data.content
                const updatedMessages = [...newMessages]
                updatedMessages[updatedMessages.length - 1].content = accumulatedContent
                setMessages(updatedMessages)
                saveCurrentChat(updatedMessages)
              } else if (data.event === 'thinking') {
                thinkingSteps.push(data.message)
                const updatedMessages = [...newMessages]
                updatedMessages[updatedMessages.length - 1].thinkingSteps = thinkingSteps
                setMessages(updatedMessages)
              } else if (data.event === 'sources') {
                sources = data.sources
                const updatedMessages = [...newMessages]
                updatedMessages[updatedMessages.length - 1].sources = sources
                setMessages(updatedMessages)
              } else if (data.event === 'done') {
                const updatedMessages = [...newMessages]
                updatedMessages[updatedMessages.length - 1].isStreaming = false
                setMessages(updatedMessages)
                saveCurrentChat(updatedMessages)
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Query failed:', error)
      const updatedMessages = [...newMessages]
      updatedMessages[updatedMessages.length - 1] = {
        ...updatedMessages[updatedMessages.length - 1],
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        isStreaming: false,
        isError: true,
      }
      setMessages(updatedMessages)
      saveCurrentChat(updatedMessages)
    } finally {
      setIsStreaming(false)
    }
  }

  const sendMessage = (message: string) => {
    if (!message.trim() || isStreaming) return
    setInput(message)
    handleSend()
  }

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  const connectedIntegrations = integrations.filter(i => i.is_active)
  const hasIntegrations = connectedIntegrations.length > 0
  const currentChat = chats.find(c => c.id === currentChatId)

  return (
    <div className="flex h-full bg-gray-950">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Recent Chats
            </h3>
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative rounded-lg transition-all ${
                    currentChatId === chat.id
                      ? 'bg-gray-800 shadow-sm'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentChatId(chat.id)
                      setMessages(chat.messages)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {editingChatId === chat.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateChatTitle(chat.id, editingTitle)
                            } else if (e.key === 'Escape') {
                              setEditingChatId(null)
                              setEditingTitle('')
                            }
                          }}
                          className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => updateChatTitle(chat.id, editingTitle)}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingChatId(null)
                            setEditingTitle('')
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-200 truncate">
                          {chat.title}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingChatId(chat.id)
                              setEditingTitle(chat.title)
                            }}
                            className="text-gray-400 hover:text-gray-300 p-1"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteChat(chat.id)
                            }}
                            className="text-gray-400 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Chats: {chats.length}</span>
              <span>Messages: {chats.reduce((acc, chat) => acc + chat.messages.length, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-800 px-6 py-4 bg-gray-900 flex-shrink-0">
          <h1 className="text-xl font-semibold text-white">
            {currentChat?.title || 'Chat'}
          </h1>
          {currentChat && (
            <p className="text-sm text-gray-400 mt-1">
              {currentChat.messages.length} messages • Updated {new Date(currentChat.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {!loadingIntegrations && !hasIntegrations && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-200 mb-1">No integrations connected</h3>
                <p className="text-sm text-yellow-300/80 mb-2">
                  Connect GitHub, Notion, or Slack to get better answers about your project.
                </p>
                <a
                  href="/dashboard/integrations"
                  className="text-sm text-yellow-400 hover:text-yellow-300 underline"
                >
                  Connect integrations →
                </a>
              </div>
            </div>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ask anything about your project</h2>
              <p className="text-gray-400 text-sm">
                {hasIntegrations
                  ? `I'll search through your ${connectedIntegrations.map(i => i.provider).join(', ')} data`
                  : 'Connect integrations to get better answers'}
              </p>
            </div>
            {hasIntegrations && (
              <div className="flex gap-2 mb-8">
                {connectedIntegrations.map(i => (
                  <span key={i.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-full text-xs font-medium text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {i.provider.charAt(0).toUpperCase() + i.provider.slice(1)}
                  </span>
                ))}
              </div>
            )}
            <div className="w-full max-w-3xl">
              <p className="text-sm font-medium text-gray-400 mb-4 text-center">💡 Try these questions:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedQuestion(q)}
                    className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-gray-200 text-sm rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 border border-gray-700 hover:border-gray-600 text-left font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-sm'
                  : msg.isError
                  ? 'bg-gradient-to-r from-red-900 to-red-800 border border-red-700 text-red-100 rounded-tl-sm'
                  : 'bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 text-white rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' && msg.thinkingSteps && msg.thinkingSteps.length > 0 && msg.isStreaming && (
                <div className="bg-gray-950/50 backdrop-blur-sm rounded-lg p-3 mb-3 border border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>🤔 {msg.thinkingSteps[msg.thinkingSteps.length - 1]}</span>
                  </div>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
                {msg.isStreaming && <span className="inline-block w-0.5 h-4 bg-current ml-1 animate-pulse" />}
              </div>
              {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  <p className="text-xs font-semibold text-gray-400 mb-2.5">📚 Sources ({msg.sources.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((s: any, j: number) => (
                      <a
                        key={j}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 text-gray-300 text-xs rounded-lg hover:bg-gray-700 transition-all border border-gray-700 hover:border-gray-600 font-medium"
                      >
                        <span>🔗 {s.type}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 p-4 bg-gradient-to-b from-gray-900 to-black flex-shrink-0">
        <div className="flex gap-3 items-end max-w-none w-full">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="💬 Ask about your project... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[48px] max-h-[120px] shadow-lg"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-3.5 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex-shrink-0"
          >
            {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-3 font-medium">
          ✨ Powered by your connected integrations • Only answers about your project
        </p>
      </div>
      </div>
    </div>
  )
}
