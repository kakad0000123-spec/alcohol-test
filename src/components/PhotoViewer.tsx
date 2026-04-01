'use client'

import { useState, useEffect } from 'react'
import type { Record as AlcoholRecord } from '@/types'

interface Props {
  records: AlcoholRecord[]
  onDelete?: (id: string) => void
  manageable?: boolean
}

export default function PhotoViewer({ records, onDelete, manageable = false }: Props) {
  const [urls, setUrls] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUrls() {
      for (const record of records) {
        if (!record.file_path || urls[record.id]) continue
        setLoading(prev => ({ ...prev, [record.id]: true }))
        try {
          const res = await fetch(`/api/records/photo?path=${encodeURIComponent(record.file_path)}`)
          const data = await res.json()
          if (data.url) setUrls(prev => ({ ...prev, [record.id]: data.url }))
        } finally {
          setLoading(prev => ({ ...prev, [record.id]: false }))
        }
      }
    }
    fetchUrls()
  }, [records]) // eslint-disable-line react-hooks/exhaustive-deps

  if (records.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {records.map(record => (
          <div key={record.id} className="relative aspect-square rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            {loading[record.id] ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="spinner w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--accent)' }} />
              </div>
            ) : urls[record.id] ? (
              <>
                <img
                  src={urls[record.id]}
                  alt="酒測照片"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelected(urls[record.id])}
                />
                {manageable && onDelete && (
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(record.id) }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold"
                    style={{ background: '#dc2626' }}
                  >
                    ×
                  </button>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                無法載入
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 全螢幕預覽 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSelected(null)}
        >
          <img
            src={selected}
            alt="放大預覽"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full text-white text-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            onClick={() => setSelected(null)}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
