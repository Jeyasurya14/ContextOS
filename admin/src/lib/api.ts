// admin/src/lib/api.ts

import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token')
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  
  // Stats
  getStats: () => api.get('/api/v1/admin/stats'),
  
  // Users
  getUsers: (params?: { limit?: number; offset?: number; search?: string; plan?: string; is_active?: boolean }) =>
    api.get('/api/v1/admin/users', { params }),
  
  getUserDetails: (userId: string) =>
    api.get(`/api/v1/admin/users/${userId}`),
  
  updateUser: (userId: string, data: { full_name?: string; plan?: string; is_active?: boolean; is_admin?: boolean }) =>
    api.patch(`/api/v1/admin/users/${userId}`, data),
  
  deleteUser: (userId: string) =>
    api.delete(`/api/v1/admin/users/${userId}`),
  
  // Integrations
  getIntegrations: (params?: { limit?: number; offset?: number; provider?: string }) =>
    api.get('/api/v1/admin/integrations', { params }),
  
  // Billing
  getBillingEvents: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/v1/admin/billing/events', { params }),
}

export default api
