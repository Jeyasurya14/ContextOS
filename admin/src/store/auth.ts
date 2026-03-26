// admin/src/store/auth.ts

import { create } from 'zustand'

interface AdminUser {
  id: string
  email: string
  full_name: string
  is_admin: boolean
}

interface AuthState {
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: AdminUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null,
  isAuthenticated: false,
  
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token)
    }
    set({ user, token, isAuthenticated: true })
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token')
    }
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
