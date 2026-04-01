'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AuthUser, VendorRecord } from '@/types'
import { getTodayDate, getCurrentSession } from '@/lib/utils'
import PhotoViewer from './PhotoViewer'

interface DashboardData {
  date: string
  session: string
  vendors: VendorRecord[]
  reportedCount: number
  totalCount: number
  totalPhotos: number
}

type FilterType = 'all' | 'reported' | 'not_reported'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DashboardClient({ user: _user }: { user: AuthUser }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<'AM' | 'PM' | 'Night'>(getCurrentSession())
  const [date] = useState(getTodayDate())
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?date=${date}&session=${session}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } finally {
      setLoading(false)
    }
  }, [date, session])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // 30 秒自動更新
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredVendors = data?.vendors.filter(v => {
    if (filter === 'reported') return v.hasReported
    if (filter === 'not_reported') return !v.hasReported
    return true
  }) || []

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* 日期 + 場次切換 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{date}</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>即時看板（每 30 秒更新）</p>
        </div>
        <div className="flex gap-2">
          {([['AM', '早上'], ['PM', '下午'], ['Night', '晚上']] as const).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setSession(s)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: session === s ? 'var(--accent)' : 'var(--bg-secondary)',
                color: session === s ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${session === s ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="text-3xl font-bold" style={{ color: '#00ff88' }}>{loading ? '—' : data?.totalPhotos || 0}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>已到人數（張）</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="text-3xl font-bold" style={{ color: '#60a5fa' }}>
            {loading ? '—' : `${data?.reportedCount || 0}`}
            <span className="text-lg" style={{ color: 'var(--text-secondary)' }}>/{data?.totalCount || 0}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>已回報廠商</div>
        </div>
      </div>

      {/* 篩選按鈕 */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: '全部' },
          { key: 'reported', label: '✅ 已回報' },
          { key: 'not_reported', label: '❌ 未回報' },
        ] as { key: FilterType; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === f.key ? 'var(--bg-card)' : 'transparent',
              color: filter === f.key ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {f.label}
          </button>
        ))}
        <button onClick={fetchData} className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          ↻ 更新
        </button>
      </div>

      {/* 廠商列表 */}
      {loading && !data ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>載入中...</div>
      ) : (
        <div className="space-y-2">
          {filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {filter === 'not_reported' ? '所有廠商已回報！' : '沒有廠商資料'}
            </div>
          ) : (
            filteredVendors.map(v => (
              <div
                key={v.vendor.id}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => setExpandedVendor(expandedVendor === v.vendor.id ? null : v.vendor.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{v.hasReported ? '✅' : '❌'}</span>
                    <div>
                      <div className="font-medium text-white text-sm">{v.vendor.name}</div>
                      {v.vendor.contact && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{v.vendor.contact}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.hasReported && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0d2e1a', color: '#4ade80' }}>
                        {v.count} 張
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{expandedVendor === v.vendor.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expandedVendor === v.vendor.id && v.hasReported && (
                  <div className="px-4 pb-3">
                    <PhotoViewer records={v.records} />
                  </div>
                )}

                {expandedVendor === v.vendor.id && !v.hasReported && (
                  <div className="px-4 pb-3 text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                    尚未回報
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
