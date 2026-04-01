'use client'

import { useState, useEffect, useRef } from 'react'
import { getTodayDate, getCurrentSession, compressImage, hashFile } from '@/lib/utils'
import type { Record as AlcoholRecord } from '@/types'
import PhotoViewer from '@/components/PhotoViewer'

export default function UploadPage() {
  const [session, setSession] = useState<'AM' | 'PM'>(getCurrentSession())
  const date = getTodayDate()
  const [records, setRecords] = useState<AlcoholRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 })
  const [managing, setManaging] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRecords() }, [session])

  async function fetchRecords() {
    const res = await fetch(`/api/records?date=${date}&session=${session}`)
    const data = await res.json()
    if (res.status === 401) { window.location.href = '/'; return }
    if (res.ok) setRecords(data.records || [])
  }

  function showMsg(text: string, type: 'success' | 'error' | 'info' = 'info') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleFiles(files: FileList) {
    if (!files.length) return
    const fileArray = Array.from(files)
    setUploading(true)
    setProgress({ current: 0, total: fileArray.length, percent: 0 })
    let successCount = 0
    let dupCount = 0

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      setProgress({ current: i + 1, total: fileArray.length, percent: Math.round(((i + 0.5) / fileArray.length) * 100) })

      try {
        // 計算原始 hash（用於去重）
        const fileHash = await hashFile(file)

        // 壓縮圖片
        const compressed = await compressImage(file)
        const compressedFile = new File([compressed], `${fileHash}.jpg`, { type: 'image/jpeg' })

        // 上傳
        const formData = new FormData()
        formData.append('file', compressedFile)
        formData.append('date', date)
        formData.append('session', session)
        formData.append('file_hash', fileHash)

        const res = await fetch('/api/records', { method: 'POST', body: formData })
        const data = await res.json()

        if (res.status === 409) { dupCount++; continue }
        if (!res.ok) { showMsg(data.error || '上傳失敗', 'error'); continue }
        successCount++
      } catch (err) {
        console.error('Upload error:', err)
      }

      setProgress({ current: i + 1, total: fileArray.length, percent: Math.round(((i + 1) / fileArray.length) * 100) })
    }

    setUploading(false)
    setProgress({ current: 0, total: 0, percent: 0 })
    await fetchRecords()

    if (successCount > 0) showMsg(`成功上傳 ${successCount} 張照片${dupCount > 0 ? `，${dupCount} 張重複跳過` : ''}`, 'success')
    else if (dupCount > 0) showMsg(`${dupCount} 張照片已上傳過，跳過`, 'info')
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這張照片？')) return
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchRecords(); showMsg('照片已刪除', 'success') }
    else { const d = await res.json(); showMsg(d.error || '刪除失敗', 'error') }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/'
  }

  const msgColors = {
    success: { bg: '#0d2e1a', color: '#4ade80', border: '#166534' },
    error: { bg: '#2d1a1a', color: '#f87171', border: '#7f1d1d' },
    info: { bg: '#1a1a2e', color: '#93c5fd', border: '#1d4ed8' },
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* 頂部欄 */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="font-semibold text-white">{date}</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>廠商酒測照片回報</div>
        </div>
        <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#2a1a1a', color: '#f87171', border: '1px solid #7f1d1d' }}>
          登出
        </button>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 max-w-sm mx-auto w-full">
        {/* 場次切換 */}
        <div className="flex gap-3">
          {(['AM', 'PM'] as const).map(s => (
            <button
              key={s}
              onClick={() => !uploading && setSession(s)}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: session === s ? 'var(--accent)' : 'var(--bg-secondary)',
                color: session === s ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${session === s ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {s === 'AM' ? '☀️ 上午場' : '🌆 下午場'}
            </button>
          ))}
        </div>

        {/* 已回報數量（大數字） */}
        <div className="text-center py-6 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="text-6xl font-bold" style={{ color: '#00ff88' }}>{records.length}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {session === 'AM' ? '上午' : '下午'}場已回報張數
          </div>
        </div>

        {/* 訊息提示 */}
        {message && (
          <div
            className="text-sm text-center py-2.5 px-4 rounded-xl fade-in"
            style={{
              background: msgColors[message.type].bg,
              color: msgColors[message.type].color,
              border: `1px solid ${msgColors[message.type].border}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* 上傳進度 */}
        {uploading && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>上傳中 {progress.current}/{progress.total}</span>
              <span style={{ color: '#60a5fa' }}>{progress.percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%`, background: 'var(--accent)' }}
              />
            </div>
          </div>
        )}

        {/* 上傳按鈕 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="py-4 rounded-2xl font-medium text-white disabled:opacity-50 transition-all active:scale-95"
            style={{ background: 'var(--bg-secondary)', border: '2px solid var(--accent)' }}
          >
            <div className="text-2xl mb-1">📷</div>
            <div className="text-sm">拍照</div>
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="py-4 rounded-2xl font-medium text-white disabled:opacity-50 transition-all active:scale-95"
            style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)' }}
          >
            <div className="text-2xl mb-1">🖼️</div>
            <div className="text-sm">相簿</div>
          </button>
        </div>

        {/* 隱藏 input */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />

        {/* 照片管理區 */}
        {records.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">已上傳照片</span>
              <button
                onClick={() => setManaging(!managing)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{
                  background: managing ? '#7f1d1d' : 'var(--bg-primary)',
                  color: managing ? '#f87171' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {managing ? '完成' : '管理'}
              </button>
            </div>
            {managing && (
              <p className="text-xs mb-2" style={{ color: '#f87171' }}>點擊 × 刪除照片（只能刪除今天的）</p>
            )}
            <PhotoViewer records={records} onDelete={handleDelete} manageable={managing} />
          </div>
        )}
      </main>
    </div>
  )
}
