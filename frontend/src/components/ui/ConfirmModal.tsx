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
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-gray-400 text-sm mb-4">{message}</p>
        {confirmText && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Type <span className="font-mono text-white">{confirmText}</span> to confirm
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              placeholder={confirmText}
            />
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
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
