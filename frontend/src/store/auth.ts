// frontend/src/store/auth.ts

import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  plan: string;
  api_key_prefix: string | null;
  team_id: string | null;
  team_role: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setToken: (token: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  setUser: (user: User) =>
    set({ user, isAuthenticated: true }),

  setToken: (token: string, refreshToken?: string) =>
    set((state) => ({
      token,
      refreshToken: refreshToken || state.refreshToken,
      isAuthenticated: true,
    })),

  logout: () =>
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    }),
}));
