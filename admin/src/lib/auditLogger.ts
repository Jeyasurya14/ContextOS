import { config } from './config'

export enum AuditAction {
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_CREATED = 'USER_CREATED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}

interface AuditLog {
  action: AuditAction
  userId?: string
  targetUserId?: string
  details?: Record<string, any>
  timestamp: string
  ipAddress?: string
}

class AuditLogger {
  private logs: AuditLog[] = []
  private readonly maxLogs = 1000

  log(action: AuditAction, details?: Record<string, any>, targetUserId?: string) {
    if (!config.enableAuditLog) return

    const log: AuditLog = {
      action,
      userId: this.getCurrentUserId(),
      targetUserId,
      details,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(log)
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    console.log('[AUDIT]', log)
    
    this.persistLog(log)
  }

  private getCurrentUserId(): string | undefined {
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) return undefined
      
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub
    } catch {
      return undefined
    }
  }

  private persistLog(log: AuditLog) {
    try {
      const existingLogs = localStorage.getItem('audit_logs')
      const logs = existingLogs ? JSON.parse(existingLogs) : []
      logs.push(log)
      
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100)
      }
      
      localStorage.setItem('audit_logs', JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to persist audit log:', error)
    }
  }

  getLogs(): AuditLog[] {
    try {
      const logs = localStorage.getItem('audit_logs')
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }

  clearLogs() {
    localStorage.removeItem('audit_logs')
    this.logs = []
  }
}

export const auditLogger = new AuditLogger()
