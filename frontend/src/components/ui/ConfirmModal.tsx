// frontend/src/components/ui/ConfirmModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  message: string
  confirmText?: string
  confirmLabel?: string
  isDangerous?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmLabel = 'Confirm',
  isDangerous = false,
}: ConfirmModalProps) {
  const [input, setInput] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setInput('')
      setIsConfirming(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsConfirming(false)
    }
  }

  if (!isOpen) return null

  const canConfirm = confirmText ? input === confirmText : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative bg-[#1a1a1d] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#6b7280] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white mb-2 pr-8">{title}</h2>
        <p className="text-[#9ca3af] text-sm mb-5 leading-relaxed">{message}</p>
        {confirmText && (
          <div className="mb-5">
            <label className="block text-sm text-[#9ca3af] mb-2">
              Type <span className="font-mono text-white font-medium">{confirmText}</span> to confirm
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-[#202024] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand/40 transition-colors"
              placeholder={confirmText}
            />
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="btn btn-secondary disabled:opacity-50 flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming}
            className={`btn disabled:opacity-50 flex items-center justify-center gap-2 flex-1 ${
              isDangerous
                ? 'bg-danger hover:bg-danger/90 text-white border-danger'
                : 'bg-brand hover:bg-brand/90 text-black border-brand font-semibold'
            }`}
          >
            {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
