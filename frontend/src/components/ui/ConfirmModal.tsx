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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-dark-900 border border-dark-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-dark-400 text-sm mb-4">{message}</p>
        {confirmText && (
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-2">
              Type <span className="font-mono text-white">{confirmText}</span> to confirm
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand/50 transition"
              placeholder={confirmText}
            />
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="btn btn-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming}
            className={`btn disabled:opacity-50 flex items-center justify-center gap-2 ${
              isDangerous
                ? 'bg-danger hover:bg-danger/80 text-white border-danger'
                : 'bg-brand hover:bg-brand/80 text-white border-brand'
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
