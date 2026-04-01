'use client'

import { useState } from 'react'

export default function BackupPage() {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/export')
      if (!res.ok) { alert('匯出失敗'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-white">備份管理</h2>

      {/* 自動備份說明 */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="font-medium text-white">自動備份排程</div>
        <div className="text-sm space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-start gap-2">
            <span>📅</span>
            <span>每週日凌晨 2:00（台灣時間）自動執行</span>
          </div>
          <div className="flex items-start gap-2">
            <span>📧</span>
            <span>備份 JSON 以附件寄送至已設定的 Email</span>
          </div>
          <div className="flex items-start gap-2">
            <span>📦</span>
            <span>包含：帳號、廠商、紀錄、日報設定、收件人資料</span>
          </div>
          <div className="flex items-start gap-2">
            <span>🗑️</span>
            <span>照片不含在備份中（自動 5 天刪除）</span>
          </div>
        </div>
      </div>

      {/* 手動匯出 */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="font-medium text-white">手動匯出備份</div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          立即下載目前所有資料的 JSON 備份檔案，不含照片。
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}
        >
          {exporting ? (
            <>
              <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
              匯出中...
            </>
          ) : (
            <>💾 下載備份 JSON</>
          )}
        </button>
      </div>

      {/* 照片清理說明 */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="font-medium text-white">照片自動清理</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>每天凌晨 2:00 自動執行清理：</p>
          <ul className="mt-1.5 space-y-1 list-disc list-inside">
            <li>刪除 5 天前的照片（儲存空間）</li>
            <li>保留紀錄表中的歷史資料</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
