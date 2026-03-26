// frontend/src/lib/api.ts

import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 120000, // 2 minutes for slow operations like GitHub sync
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        '[API Error]',
        error?.config?.method?.toUpperCase(),
        error?.config?.url,
        '→',
        error?.response?.status,
        error?.response?.data?.detail || error?.message
      )
    }

    const status = error?.response?.status

    if (status === 401) {
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined' &&
          !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  register: (email: string, name: string, password: string) =>
    api.post('/api/v1/auth/register', { email, full_name: name, password }),
  getMe: () => api.get('/api/v1/auth/me'),
  updateProfile: (name: string) =>
    api.put('/api/v1/auth/me', { full_name: name }),
  logout: () => api.post('/api/v1/auth/logout'),
  generateApiKey: (name: string) =>
    api.post('/api/v1/auth/api-keys', { name }),
  getApiKeys: () => api.get('/api/v1/auth/api-keys'),
  deleteApiKey: (id: string) =>
    api.delete(`/api/v1/auth/api-keys/${id}`),
  deleteAccount: () => api.delete('/api/v1/auth/me'),
}

export const projectsApi = {
  getAll: () => api.get('/api/v1/projects'),
  create: (name: string, description?: string) =>
    api.post('/api/v1/projects', { name, description }),
  update: (id: string, name: string, description?: string) =>
    api.patch(`/api/v1/projects/${id}`, { name, description }),
  delete: (id: string) => api.delete(`/api/v1/projects/${id}`),
}

export const integrationsApi = {
  getAll: () => api.get('/api/v1/integrations'),
  getGithubUrl: () =>
    api.get('/api/v1/integrations/github/connect'),
  getNotionUrl: () =>
    api.get('/api/v1/integrations/notion/connect'),
  getSlackUrl: () =>
    api.get('/api/v1/integrations/slack/connect'),
  getLinearUrl: () =>
    api.get('/api/v1/integrations/linear/connect'),
  getGoogleUrl: () =>
    api.get('/api/v1/integrations/google/connect'),
  disconnect: (tool: string) =>
    api.delete(`/api/v1/integrations/${tool}/disconnect`),
  syncGithub: () => api.post('/api/v1/integrations/github/sync'),
  syncLinear: () => api.post('/api/v1/integrations/linear/sync'),
  syncGoogle: () => api.post('/api/v1/integrations/google/sync'),
  getStats: () => api.get('/api/v1/integrations/stats'),
  clearAll: () => api.delete('/api/v1/context/all'),
}

export const teamsApi = {
  getMyTeam: () => api.get('/api/v1/teams/me'),
  create: (name: string) => api.post('/api/v1/teams', { name }),
  getMembers: () => api.get('/api/v1/teams/me/members'),
  invite: (teamId: string, email: string, role: string) =>
    api.post(`/api/v1/teams/${teamId}/invite`, { email, role }),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/api/v1/teams/${teamId}/members/${userId}`),
  updateRole: (teamId: string, userId: string, role: string) =>
    api.put(`/api/v1/teams/${teamId}/members/${userId}/role`, { role }),
  getInvitation: (token: string) =>
    api.get(`/api/v1/teams/invitations/${token}`),
  acceptInvitation: (token: string) =>
    api.post(`/api/v1/teams/invite/accept`, { token }),
}

export const billingApi = {
  getPlans: () => api.get('/api/v1/billing/plans'),
  getSubscription: () => api.get('/api/v1/billing/subscription'),
  getUsage: () => api.get('/api/v1/billing/usage'),
  createOrder: (plan: string) =>
    api.post('/api/v1/billing/create-order', { plan }),
  verifyPayment: (data: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    plan: string
  }) => api.post('/api/v1/billing/verify-payment', data),
}

export const queryApi = {
  stream: (
    question: string,
    token: string,
    options?: { project_id?: string; team_id?: string }
  ): Promise<Response> => {
    return fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          stream: true,
          ...options,
        }),
      }
    )
  },
}

export default api
