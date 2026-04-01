'use client'

import { useEffect } from 'react'

interface Props {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  confirmText?: string
  danger?: boolean
}

export default function Modal({ open, title, children, onClose, onConfirm, loading, confirmText = '儲存', danger }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 fade-in"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--text-secondary)' }}>×</button>
        </div>

        <div className="mb-5">{children}</div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
            style={{ background: danger ? '#dc2626' : 'var(--accent)' }}
          >
            {loading ? '處理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
