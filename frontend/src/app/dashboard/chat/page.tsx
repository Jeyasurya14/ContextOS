'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Send, Loader2, AlertCircle, Plus, MessageSquare, Trash2, Edit3, Check, Copy, CheckCheck, Bot, User, Menu, X, Search, Share2, Bookmark, MoreVertical, Reply, RefreshCw, Paperclip, Smile } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { queryApi, integrationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  thinkingSteps?: { step: string; duration?: number }[]
  sources?: any[]
  isStreaming?: boolean
  isError?: boolean
  timestamp?: Date
  isBookmarked?: boolean
  replyTo?: number
  attachments?: {
    type: 'image' | 'file' | 'code'
    url: string
    name: string
  }[]
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  isPinned?: boolean
  isArchived?: boolean
  tags?: string[]
}

const SUGGESTED_QUESTIONS = [
  'What\'s the status of my recent work?',
  'Show me my latest commits and changes',
  'Give me a summary of my GitHub activity',
  'What bugs have I fixed recently?',
  'What did I work on today?',
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
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null)
  const [inputHeight, setInputHeight] = useState('44px')
  const [currentThinkingStep, setCurrentThinkingStep] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Advanced features state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [bookmarkedMessages, setBookmarkedMessages] = useState<number[]>([])
  const [showMessageActions, setShowMessageActions] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

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
    textareaRef.current?.focus()
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
    if (!newTitle.trim()) return
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

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  // Advanced functions
  const toggleBookmark = (messageId: number) => {
    setBookmarkedMessages(prev => {
      if (prev.includes(messageId)) {
        toast.success('Bookmark removed')
        return prev.filter(id => id !== messageId)
      } else {
        toast.success('📌 Message bookmarked')
        return [...prev, messageId]
      }
    })
  }

  const shareMessage = (content: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Shared from ContextOS',
        text: content
      })
    } else {
      navigator.clipboard.writeText(content)
      toast.success('Message copied to clipboard')
    }
  }

  const handleReply = (messageId: number) => {
    const message = messages.find(m => m.id === messageId)
    if (message) {
      setReplyingTo(messageId)
      setReplyText(message.content.slice(0, 50) + (message.content.length > 50 ? '...' : ''))
      textareaRef.current?.focus()
    }
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyText('')
  }

  // Emoji picker functionality
  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  // Common emojis
  const commonEmojis = ['😊', '👍', '❤️', '🎉', '🔥', '💯', '🚀', '✨', '💡', '🎯', '📝', '💬']

  // Attachment handlers
  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        toast.success(`📷 Image "${file.name}" uploaded`)
        setShowAttachMenu(false)
      }
    }
    input.click()
  }

  const handleFileUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        toast.success(`📄 File "${file.name}" uploaded`)
        setShowAttachMenu(false)
      }
    }
    input.click()
  }

  const handleCodePaste = () => {
    navigator.clipboard.readText().then(text => {
      if (text.trim()) {
        setInput(prev => prev + '\n```' + text + '```\n')
        toast.success('💻 Code pasted from clipboard')
        setShowAttachMenu(false)
        textareaRef.current?.focus()
      } else {
        toast.info('No code found in clipboard')
      }
    }).catch(() => {
      toast.info('Could not access clipboard')
    })
  }

  // Enhanced send with reply support
  const handleSendWithReply = async () => {
    if (!input.trim() || isStreaming) return

    if (!currentChatId) {
      createNewChat()
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      replyTo: replyingTo || undefined,
    }

    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    saveCurrentChat(newMessages)
    setInput('')
    setInputHeight('44px')
    setIsStreaming(true)
    setCurrentThinkingStep('')
    cancelReply()

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({ 
          question: userMessage.content,
          reply_to: replyingTo 
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      let accumulatedContent = ''
      const decoder = new TextDecoder()
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

              if (data.event === 'thinking') {
                setCurrentThinkingStep(data.message || 'Thinking...')
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1].thinkingSteps = updated[updated.length - 1].thinkingSteps || []
                  updated[updated.length - 1].thinkingSteps!.push({
                    step: data.message || 'Thinking...',
                    duration: data.duration
                  })
                  return updated
                })
              } else if (data.event === 'searching') {
                setCurrentThinkingStep(`Searching ${data.source || ''} (${data.count || 0} results)`)
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1].thinkingSteps = updated[updated.length - 1].thinkingSteps || []
                  updated[updated.length - 1].thinkingSteps!.push({
                    step: `Searching ${data.source || ''} (${data.count || 0} results)`,
                    duration: data.duration
                  })
                  return updated
                })
              } else if (data.event === 'token') {
                accumulatedContent += data.content
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1].content = accumulatedContent
                  return updated
                })
              } else if (data.event === 'sources') {
                sources = data.sources
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1].sources = sources
                  return updated
                })
              } else if (data.event === 'done') {
                setCurrentThinkingStep('')
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1].isStreaming = false
                  return updated
                })
                saveCurrentChat(messages)
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Query failed:', error)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          isStreaming: false,
          isError: true,
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  // Export chat functionality
  const exportChat = () => {
    if (!currentChat) return
    
    const chatContent = {
      title: currentChat.title,
      createdAt: currentChat.createdAt,
      messages: currentChat.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    }
    
    const blob = new Blob([JSON.stringify(chatContent, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${currentChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('📥 Chat exported successfully')
  }

  // Command handler
  const handleCommand = (command: string) => {
    const cmd = command.toLowerCase()
    
    switch(cmd) {
      case '/clear':
        setMessages([])
        toast.success('🧹 Chat cleared')
        break
      case '/export':
        exportChat()
        break
      case '/help':
        toast.info('Commands: /clear, /export, /help, /bookmarks')
        break
      case '/bookmarks':
        const bookmarkedMsgs = messages.filter(m => bookmarkedMessages.includes(m.id))
        if (bookmarkedMsgs.length > 0) {
          toast.info(`📌 ${bookmarkedMsgs.length} bookmarked messages`)
        } else {
          toast.info('No bookmarked messages')
        }
        break
      default:
        if (cmd.startsWith('/')) {
          toast.info(`Unknown command: ${cmd}. Type /help for available commands.`)
        }
    }
  }

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredMessages = messages.filter(msg =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (msg.sources && msg.sources.some((s: any) => s.type.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea with command support
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    
    // Check for commands
    if (value.startsWith('/') && value.includes(' ')) {
      const command = value.split(' ')[0]
      handleCommand(command)
      return
    }
    
    const textarea = e.target
    const newHeight = Math.min(textarea.scrollHeight, 150)
    setInputHeight(`${newHeight}px`)
  }

  const handleSend = () => {
    if (input.startsWith('/')) {
      handleCommand(input)
      setInput('')
      return
    }
    handleSendWithReply()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [input, isStreaming])

  const connectedIntegrations = integrations.filter(i => i.is_active)
  const hasIntegrations = connectedIntegrations.length > 0
  const currentChat = chats.find(c => c.id === currentChatId)

  const formatTime = (date?: Date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const handleSendWithInput = (text: string) => {
    setInput(text)
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(Date.now())
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed sm:relative w-80 bg-dark-900/40 border-r border-dark-800/40 flex flex-col flex-shrink-0 backdrop-blur-xl z-50 sm:z-10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
      }`}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800/30 sm:hidden">
          <h2 className="text-sm font-medium text-white">Chats</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* New Chat Button */}
        <div className="p-3 border-b border-dark-800/30">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20 rounded-lg transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-2">
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative rounded-lg p-3 cursor-pointer transition-all ${
                    currentChatId === chat.id
                      ? 'bg-brand/10 border border-brand/20'
                      : 'hover:bg-dark-800/40 border border-transparent'
                  }`}
                  onClick={() => setCurrentChatId(chat.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => updateChatTitle(chat.id, editingTitle)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateChatTitle(chat.id, editingTitle)
                            if (e.key === 'Escape') setEditingChatId(null)
                          }}
                          className="w-full bg-transparent text-white text-sm font-medium outline-none border-b border-brand/50"
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-sm font-medium text-white truncate">{chat.title}</h3>
                      )}
                      <p className="text-xs text-dark-400 mt-1">
                        {formatTime(chat.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingChatId(chat.id)
                          setEditingTitle(chat.title)
                        }}
                        className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(chat.id)
                        }}
                        className="p-1 rounded text-dark-400 hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-dark-800/30 px-4 sm:px-6 py-3 bg-dark-900/20 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors sm:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Search Button */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-md text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
                  {currentChat?.title || 'New conversation'}
                </h1>
                <p className="text-xs text-dark-400 mt-1 hidden sm:block">
                  {connectedIntegrations.length} integration{connectedIntegrations.length !== 1 ? 's' : ''} connected
                  {filteredMessages.length !== messages.length && ` • ${filteredMessages.length} filtered messages`}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportChat}
                className="p-2 rounded-md text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
                title="Export chat"
              >
                <Share2 className="w-4 h-4" />
              </button>
              
              {hasIntegrations && (
                <div className="flex gap-1.5 flex-shrink-0 ml-2">
                  {connectedIntegrations.slice(0, 3).map(i => (
                    <span
                      key={i.id}
                      className="px-2 py-1 bg-success/10 border border-success/20 rounded-full text-[10px] font-medium text-success hidden xs:block"
                    >
                      {i.provider.charAt(0).toUpperCase() + i.provider.slice(1)}
                    </span>
                  ))}
                  {connectedIntegrations.length > 3 && (
                    <span className="px-2 py-1 bg-dark-800 border border-dark-700 rounded-full text-[10px] font-medium text-dark-300">
                      +{connectedIntegrations.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Search Bar */}
          {showSearch && (
            <div className="max-w-4xl mx-auto mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages and chats..."
                  className="w-full pl-10 pr-4 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-brand/50 transition-colors"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full flex flex-col max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Search Results Indicator */}
            {searchQuery && (
              <div className="mb-4 p-2 bg-dark-800/40 rounded-lg border border-dark-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">
                    Found {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-brand hover:text-brand-light"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {(searchQuery ? filteredMessages : messages).map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`group flex gap-4 py-6 animate-fade-in ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/20'
                      : 'bg-dark-800 border border-dark-700 text-dark-300'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div
                      className={`inline-block max-w-full rounded-2xl px-4 py-3 sm:px-5 sm:py-4 prose-content ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/20'
                          : msg.isError
                          ? 'bg-danger/10 border border-danger/20 text-danger'
                          : 'bg-dark-800/60 border border-dark-700/50 text-dark-200 backdrop-blur-sm'
                      }`}
                    >
                      {msg.content}
                      {msg.isStreaming && <span className="inline-block w-0.5 h-5 bg-current ml-1 animate-pulse align-middle" />}
                    </div>

                    {/* Message Actions */}
                    {!msg.isStreaming && msg.content && (
                      <div className={`flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => handleCopyMessage(msg.content)}
                          className="p-1.5 text-xs text-dark-400 hover:text-white hover:bg-dark-800/60 rounded transition-all"
                          title="Copy message"
                        >
                          {copiedMessageId === msg.id ? (
                            <CheckCheck className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Empty State */}
            {!loadingIntegrations && !hasIntegrations && messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-brand/10 to-brand/20 border border-brand/20 rounded-2xl mb-6">
                    <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-brand" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3">How can I help you today?</h2>
                  <p className="text-dark-400 max-w-md text-sm sm:text-base">
                    Connect GitHub, Notion, or Slack to get personalized answers from your workspace.
                  </p>
                </div>
                <a
                  href="/dashboard/integrations"
                  className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand-light font-medium transition-colors"
                >
                  Set up integrations
                  <span className="transform transition-transform group-hover:translate-x-1">→</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-dark-800/30 bg-gradient-to-t from-dark-950/90 to-dark-900/50 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-3 items-end">
              {/* Input Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800/50 rounded-xl transition-all"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
                
              </div>

              {/* Main Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Send a message... (Ctrl+Enter to send)"
                  rows={1}
                  style={{ height: inputHeight }}
                  className="w-full bg-dark-900/80 border border-dark-700/50 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-base text-white placeholder-dark-500 resize-none focus:outline-none focus:border-brand/50 focus:bg-dark-800/60 focus:ring-2 focus:ring-brand/20 transition-all min-h-[52px] sm:min-h-[56px] backdrop-blur-sm"
                />
                
                {/* Input Status */}
                <div className="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none">
                  {input.length > 0 && (
                    <span className="text-xs text-dark-500">{input.length}</span>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand/20 h-[52px] sm:h-[56px] px-4 sm:px-6 rounded-2xl"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between mt-3 text-[10px] text-dark-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span>Ctrl+Enter to send</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Press / for commands</span>
                <span className="w-1 h-1 bg-dark-600 rounded-full" />
                <span>Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="fixed bottom-20 left-4 bg-dark-800 border border-dark-700 rounded-lg shadow-lg p-2 z-50">
          <div className="grid grid-cols-6 gap-1">
            {['😊', '👍', '❤️', '🎉', '🔥', '💯', '🚀', '✨', '💡', '🎯', '📝', '💬'].map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  setInput(prev => prev + emoji)
                  setShowEmojiPicker(false)
                  textareaRef.current?.focus()
                }}
                className="p-2 text-lg hover:bg-dark-700 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}