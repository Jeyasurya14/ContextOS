// frontend/src/components/ui/Toast.tsx
'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface ToastContextType {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev.slice(-4), { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    warning: (message: string) => addToast('warning', message),
    info: (message: string) => addToast('info', message),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 min-w-[340px] max-w-md p-4 rounded-lg border backdrop-blur-sm shadow-lg animate-in slide-in-from-bottom-5 ${
              t.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-800/50 text-emerald-50'
                : t.type === 'error'
                ? 'bg-red-950/95 border-red-800/50 text-red-50'
                : t.type === 'warning'
                ? 'bg-amber-950/95 border-amber-800/50 text-amber-50'
                : 'bg-blue-950/95 border-blue-800/50 text-blue-50'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
            {t.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
            <p className="flex-1 text-sm leading-relaxed">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 hover:opacity-60 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
