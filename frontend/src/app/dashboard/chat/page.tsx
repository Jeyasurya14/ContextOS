// frontend/src/app/dashboard/chat/page.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { streamQuery, queryApi } from '@/lib/api';
import type { ConversationSummary } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ type: string; url: string; score: number }>;
}

interface ThinkingStep {
  type: string;
  text: string;
}

export default function ChatPage() {
  const { token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    queryApi.conversations().then((res) => setConversations(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingSteps]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !token) return;

    const question = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsStreaming(true);
    setThinkingSteps([]);

    let assistantContent = '';
    let sources: Array<{ type: string; url: string; score: number }> = [];

    try {
      for await (const event of streamQuery(question, token, conversationId || undefined)) {
        const evt = event as Record<string, unknown>;
        switch (evt.event) {
          case 'thinking':
            setThinkingSteps((prev) => [...prev, { type: 'thinking', text: evt.message as string }]);
            break;
          case 'searching':
            setThinkingSteps((prev) => [
              ...prev,
              { type: 'searching', text: `Searching ${evt.source} (${evt.count} results)` },
            ]);
            break;
          case 'token':
            assistantContent += evt.content as string;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: assistantContent };
              } else {
                updated.push({ role: 'assistant', content: assistantContent });
              }
              return updated;
            });
            break;
          case 'sources':
            sources = (evt.sources as Array<{ type: string; url: string; score: number }>) || [];
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, sources };
              }
              return updated;
            });
            break;
          case 'done':
            if (evt.conversation_id) {
              setConversationId(evt.conversation_id as string);
            }
            break;
          case 'error':
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: `Error: ${evt.message}` },
            ]);
            break;
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to connect to server.' },
      ]);
    } finally {
      setIsStreaming(false);
      setThinkingSteps([]);
    }
  }, [input, isStreaming, token, conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const res = await queryApi.conversation(id);
      setConversationId(id);
      setMessages(
        res.data.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sources: m.sources || undefined,
        }))
      );
    } catch {
      // ignore
    }
  };

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
    setThinkingSteps([]);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8">
      {/* Sidebar */}
      <div className="w-64 bg-dark-900 border-r border-dark-700 flex flex-col">
        <div className="p-3 border-b border-dark-700">
          <button
            onClick={newChat}
            className="w-full bg-brand text-white text-sm py-2 rounded-lg hover:bg-brand-dark transition"
          >
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => loadConversation(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition ${
                conversationId === c.id
                  ? 'bg-brand/10 text-brand-light'
                  : 'text-dark-300 hover:bg-dark-800'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-dark-500">
              <p className="text-lg mb-1">Ask anything about your project</p>
              <p className="text-sm">ContextOS will search your GitHub, Notion, Slack, and workspace</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand text-white rounded-br-sm'
                    : 'bg-dark-900 border border-dark-700 text-dark-100 rounded-bl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-dark-600">
                    {msg.sources.map((s, j) => (
                      <span
                        key={j}
                        className="inline-block px-2 py-0.5 bg-dark-800 border border-dark-600 rounded-full text-xs text-dark-300"
                      >
                        <span className="text-brand-light">{s.type}</span>{' '}
                        {s.url.length > 30 ? `...${s.url.slice(-30)}` : s.url}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinkingSteps.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-sm text-dark-400 italic">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {thinkingSteps[thinkingSteps.length - 1]?.text}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-dark-700 p-4 bg-dark-900">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about your project... (Ctrl+Enter to send)"
              rows={1}
              className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 text-sm text-dark-100 resize-none focus:outline-none focus:border-brand transition min-h-[44px] max-h-[120px]"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="bg-brand text-white p-3 rounded-xl hover:bg-brand-dark transition disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
