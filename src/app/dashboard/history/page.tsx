'use client'

import { useState, useEffect } from 'react'

interface HistoryItem {
  date: string
  am: number
  pm: number
  vendorCount: number
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(data => {
      if (data.history) setHistory(data.history)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>載入中...</div>

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-white">歷史紀錄</h2>

      {history.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>尚無歷史紀錄</div>
      ) : (
        <div className="space-y-2">
          {history.map(item => (
            <div
              key={item.date}
              className="p-4 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-white">{item.date}</div>
                <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1a2e1a', color: '#4ade80' }}>
                  {item.vendorCount} 家廠商
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>上午：{item.am} 張</span>
                <span>下午：{item.pm} 張</span>
                <span>合計：{item.am + item.pm} 張</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
