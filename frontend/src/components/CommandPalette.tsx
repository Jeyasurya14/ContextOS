'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, MessageSquare, Sparkles, FolderOpen, Plug,
  Users, CreditCard, Settings, BarChart, X, ArrowRight,
  Clock, Star
} from 'lucide-react'
import { searchApi } from '@/lib/api'
import Fuse from 'fuse.js'

const ICON_MAP: Record<string, any> = {
  MessageSquare, Sparkles, FolderPlus: FolderOpen, Plug,
  BarChart, Users, CreditCard, Settings,
}

interface SearchResult {
  id: string
  title?: string
  name?: string
  type: string
  [key: string]: any
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Fetch results when query changes
  useEffect(() => {
    if (!open) return
    if (query.length < 2) {
      setResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchApi.global(query)
        setResults(res.data)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, open])

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    if (!results) return []
    const items: any[] = []
    
    // Add actions first
    if (results.actions) {
      items.push(...results.actions.map((a: any) => ({ ...a, category: 'Actions' })))
    }
    
    // Add other results
    if (results.conversations) {
      items.push(...results.conversations.map((c: any) => ({ ...c, category: 'Conversations' })))
    }
    if (results.prompts) {
      items.push(...results.prompts.map((p: any) => ({ ...p, category: 'Prompts' })))
    }
    if (results.projects) {
      items.push(...results.projects.map((p: any) => ({ ...p, category: 'Projects' })))
    }
    if (results.integrations) {
      items.push(...results.integrations.map((i: any) => ({ ...i, category: 'Integrations' })))
    }

    return items
  }, [results])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, flatResults])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setSelectedIndex(0)
    }
  }, [open])

  const handleSelect = useCallback((item: any) => {
    onClose()
    
    // Handle actions
    if (item.action) {
      router.push(item.action)
      return
    }

    // Handle entities
    switch (item.type) {
      case 'conversation':
        router.push(`/dashboard/chat?id=${item.id}`)
        break
      case 'prompt':
        router.push(`/dashboard/prompts?id=${item.id}`)
        break
      case 'project':
        router.push(`/dashboard/projects?id=${item.id}`)
        break
      case 'integration':
        router.push(`/dashboard/integrations`)
        break
    }
  }, [router, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '15vh 20px 20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 640,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-base)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations, prompts, projects..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{
          maxHeight: 400,
          overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Searching...
            </div>
          ) : flatResults.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              {query.length < 2 ? 'Type to search...' : 'No results found'}
            </div>
          ) : (
            <div>
              {Object.entries(
                flatResults.reduce((acc: any, item: any) => {
                  if (!acc[item.category]) acc[item.category] = []
                  acc[item.category].push(item)
                  return acc
                }, {})
              ).map(([category, items]: [string, any]) => (
                <div key={category}>
                  <div style={{
                    padding: '8px 20px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {category}
                  </div>
                  {items.map((item: any, idx: number) => {
                    const globalIdx = flatResults.indexOf(item)
                    const isSelected = globalIdx === selectedIndex
                    const Icon = ICON_MAP[item.icon] || MessageSquare

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        onClick={() => handleSelect(item)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 20px',
                          background: isSelected ? 'rgba(245,158,11,0.08)' : 'transparent',
                          border: 'none',
                          borderLeft: isSelected ? '2px solid #fbbf24' : '2px solid transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.1s',
                        }}
                      >
                        <Icon size={16} style={{ color: isSelected ? '#fbbf24' : 'var(--text-tertiary)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {item.title || item.name}
                          </div>
                          {item.description && (
                            <div style={{
                              fontSize: 12,
                              color: 'var(--text-tertiary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {item.description}
                            </div>
                          )}
                        </div>
                        {isSelected && <ArrowRight size={14} style={{ color: '#fbbf24' }} />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}>
          <span><kbd style={{ padding: '2px 6px', background: 'var(--bg-raised)', borderRadius: 4 }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ padding: '2px 6px', background: 'var(--bg-raised)', borderRadius: 4 }}>↵</kbd> Select</span>
          <span><kbd style={{ padding: '2px 6px', background: 'var(--bg-raised)', borderRadius: 4 }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
