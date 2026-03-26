// admin/src/lib/api.ts

import axios, { AxiosError } from 'axios'
import { config } from './config'

const API_URL = config.apiUrl

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`
    }
    
    if (!config.isProduction) {
      console.log(`[API] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`)
    }
    
    return requestConfig
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    if (!config.isProduction) {
      console.log(`[API] Response ${response.status}:`, response.config.url)
    }
    return response
  },
  async (error: AxiosError<{ detail?: string }>) => {
    const originalRequest: any = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      localStorage.removeItem('admin_token')
      window.location.href = '/?session_expired=true'
      isRefreshing = false
      processQueue(error, null)
      return Promise.reject(error)
    }

    const errorMessage = error.response?.data?.detail || error.message || 'An error occurred'
    console.error('[API] Error:', errorMessage)

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    })
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
    api.put(`/api/v1/admin/users/${userId}`, data),
  
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
