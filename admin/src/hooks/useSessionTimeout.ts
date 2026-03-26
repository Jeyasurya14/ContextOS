'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { config } from '@/lib/config'

export function useSessionTimeout() {
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningTimeoutRef = useRef<NodeJS.Timeout>()

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)

    // Warning 5 minutes before timeout
    warningTimeoutRef.current = setTimeout(() => {
      console.warn('Session will expire in 5 minutes')
    }, config.sessionTimeout - 300000)

    // Logout on timeout
    timeoutRef.current = setTimeout(() => {
      logout()
      router.push('/?session_expired=true')
    }, config.sessionTimeout)
  }

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    events.forEach((event) => {
      document.addEventListener(event, resetTimeout)
    })

    resetTimeout()

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    }
  }, [])

  return { resetTimeout }
}
