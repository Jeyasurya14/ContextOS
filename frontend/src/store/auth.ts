// frontend/src/store/auth.ts
'use client'

import { create } from 'zustand'
import { authApi } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  plan: 'free' | 'pro' | 'team'
  is_active: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
  initialize: () => Promise<void>
  refreshUser: () => Promise<void>
}

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('ctx_token')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getInitialToken(),
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ctx_token', token)
      document.cookie = `ctx_token=${token}; path=/; max-age=604800; SameSite=Lax`
    }
    set({ token })
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ctx_token')
      document.cookie = 'ctx_token=; path=/; max-age=0'
    }
    set({ user: null, token: null })
  },

  initialize: async () => {
    const token = getInitialToken()

    if (!token) {
      set({ isInitialized: true, isLoading: false })
      return
    }

    set({ isLoading: true })

    try {
      const response = await authApi.getMe()
      set({
        user: response.data,
        token,
        isInitialized: true,
        isLoading: false,
      })
    } catch (err: any) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ctx_token')
        document.cookie = 'ctx_token=; path=/; max-age=0'
      }
      set({
        user: null,
        token: null,
        isInitialized: true,
        isLoading: false,
      })
    }
  },

  refreshUser: async () => {
    try {
      const response = await authApi.getMe()
      set({ user: response.data })
    } catch {
      // silent fail
    }
  },
}))
