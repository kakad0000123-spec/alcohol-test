'use client'
import { useState, useEffect } from 'react'

interface VendorDetail {
  name: string
  count: number
}

interface HistoryItem {
  date: string
  amVendorCount: number
  amPhotoCount: number
  pmVendorCount: number
  pmPhotoCount: number
  nightVendorCount: number
  nightPhotoCount: number
  amVendors: VendorDetail[]
  pmVendors: VendorDetail[]
  nightVendors: VendorDetail[]
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(data => {
      if (data.history) setHistory(data.history)
    }).finally(() => setLoading(false))
  }, [])

  async function handleExport() {
    setExportError('')
    if (!startDate || !endDate) { setExportError('請選擇開始與結束日期'); return }
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < 0) { setExportError('結束日期不能早於開始日期'); return }
    if (diffDays > 90) { setExportError('最大區間為 90 天（3 個月），請縮短日期範圍'); return }
    setExporting(true)
    try {
      const res = await fetch(`/api/export?startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) { const d = await res.json(); setExportError(d.error || '匯出失敗'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `酒測紀錄_${startDate}_${endDate}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { setExportError('匯出時發生錯誤') }
    finally { setExporting(false) }
  }

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>載入中...</div>

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-white">歷史紀錄</h2>
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="font-medium text-white text-sm">匯出報表</div>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'white' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>至</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'white' }} />
          <button onClick={handleExport} disabled={exporting}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}>
            {exporting ? '匯出中...' : '匯出 Excel'}
          </button>
        </div>
        {exportError && (
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#2d1a1a', color: '#f87171' }}>
            {exportError}
          </div>
        )}
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>最大區間 90 天，欄位：日期、廠商名稱、時段、張數</div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>尚無歷史紀錄</div>
      ) : (
        <div className="space-y-2">
          {history.map(item => (
            <div key={item.date} className="rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <button className="w-full px-4 py-3 text-left"
                onClick={() => setExpanded(expanded === item.date ? null : item.date)}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-medium text-white">{item.date}</div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {expanded === item.date ? '▲ 收起' : '▼ 展開'}
                  </span>
                </div>
                <div className="text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {(item.amVendorCount > 0 || item.amPhotoCount > 0) && (
                    <div>早上：{item.amVendorCount} 家廠商　{item.amPhotoCount} 人</div>
                  )}
                  {(item.pmVendorCount > 0 || item.pmPhotoCount > 0) && (
                    <div>下午：{item.pmVendorCount} 家廠商　{item.pmPhotoCount} 人</div>
                  )}
                  {(item.nightVendorCount > 0 || item.nightPhotoCount > 0) && (
                    <div>晚上：{item.nightVendorCount} 家廠商　{item.nightPhotoCount} 人</div>
                  )}
                  {item.amVendorCount === 0 && item.pmVendorCount === 0 && item.nightVendorCount === 0 && <div>無回報紀錄</div>}
                </div>
              </button>
              {expanded === item.date && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: 'var(--border)' }}>
                  {item.amVendors.length > 0 && (
                    <div>
                      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>早上廠商明細</div>
                      <div className="space-y-1">
                        {item.amVendors.map(v => (
                          <div key={v.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
                            style={{ background: 'var(--bg-primary)' }}>
                            <span className="text-white">{v.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0d2e1a', color: '#4ade80' }}>{v.count} 人</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.pmVendors.length > 0 && (
                    <div>
                      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>下午廠商明細</div>
                      <div className="space-y-1">
                        {item.pmVendors.map(v => (
                          <div key={v.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
                            style={{ background: 'var(--bg-primary)' }}>
                            <span className="text-white">{v.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0d2e1a', color: '#4ade80' }}>{v.count} 人</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.nightVendors.length > 0 && (
                    <div>
                      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>晚上廠商明細</div>
                      <div className="space-y-1">
                        {item.nightVendors.map(v => (
                          <div key={v.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
                            style={{ background: 'var(--bg-primary)' }}>
                            <span className="text-white">{v.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0d2e1a', color: '#4ade80' }}>{v.count} 人</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
