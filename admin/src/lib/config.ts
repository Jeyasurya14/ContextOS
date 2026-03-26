export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600000', 10),
  enableAuditLog: process.env.NEXT_PUBLIC_ENABLE_AUDIT_LOG === 'true',
  enableUserDelete: process.env.NEXT_PUBLIC_ENABLE_USER_DELETE === 'true',
  enableBulkActions: process.env.NEXT_PUBLIC_ENABLE_BULK_ACTIONS === 'true',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const

export const API_ENDPOINTS = {
  auth: {
    login: '/api/v1/auth/login',
    me: '/api/v1/auth/me',
    logout: '/api/v1/auth/logout',
  },
  admin: {
    stats: '/api/v1/admin/stats',
    users: '/api/v1/admin/users',
    integrations: '/api/v1/admin/integrations',
    auditLogs: '/api/v1/admin/audit-logs',
  },
} as const
