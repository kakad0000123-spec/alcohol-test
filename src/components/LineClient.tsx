'use client'
import { useState, useEffect } from 'react'
import type { AuthUser } from '@/types'

interface LineConfig {
  am_enabled: boolean
  am_start: string
  am_end: string
  am_token: string | null
  am_group_id: string | null
  pm_enabled: boolean
  pm_start: string
  pm_end: string
  pm_token: string | null
  pm_group_id: string | null
}

const defaultConfig: LineConfig = {
  am_enabled: false,
  am_start: '07:00',
  am_end: '09:30',
  am_token: '',
  am_group_id: '',
  pm_enabled: false,
  pm_start: '13:00',
  pm_end: '15:30',
  pm_token: '',
  pm_group_id: '',
}

function timeOptions(startHour: number, endHour: number): string[] {
  const opts: string[] = []
  for (let h = startHour; h <= endHour; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`)
    if (h < endHour) opts.push(`${String(h).padStart(2, '0')}:30`)
  }
  return opts
}

const AM_START_OPTS = timeOptions(6, 10)
const AM_END_OPTS = timeOptions(8, 12)
const PM_START_OPTS = timeOptions(12, 15)
const PM_END_OPTS = timeOptions(14, 18)

export default function LineClient(_: { user: AuthUser }) {
  const [form, setForm] = useState<LineConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/line-config')
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          setForm({
            am_enabled: data.config.am_enabled ?? false,
            am_start: data.config.am_start ?? '07:00',
            am_end: data.config.am_end ?? '09:30',
            am_token: data.config.am_token ?? '',
            am_group_id: data.config.am_group_id ?? '',
            pm_enabled: data.config.pm_enabled ?? false,
            pm_start: data.config.pm_start ?? '13:00',
            pm_end: data.config.pm_end ?? '15:30',
            pm_token: data.config.pm_token ?? '',
            pm_group_id: data.config.pm_group_id ?? '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof LineConfig>(key: K, value: LineConfig[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/line-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
      else { const d = await res.json(); alert(d.error || '儲存失敗') }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>載入中...</div>

  const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border)' }
  const labelStyle = { color: 'var(--text-secondary)' }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-white">LINE 通知設定</h2>

      {/* 上午場 */}
      <div className="rounded-xl p-4 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">上午場通知</div>
            <div className="text-xs mt-0.5" style={labelStyle}>廠商上傳後，在區間內發送 LINE 訊息</div>
          </div>
          <button
            onClick={() => set('am_enabled', !form.am_enabled)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: form.am_enabled ? 'var(--accent)' : 'var(--border)' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm"
              style={{ left: form.am_enabled ? '26px' : '2px' }}
            />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1" style={labelStyle}>通知區間起始</label>
            <select
              value={form.am_start}
              onChange={e => set('am_start', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {AM_START_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={labelStyle}>通知區間結束</label>
            <select
              value={form.am_end}
              onChange={e => set('am_end', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {AM_END_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1" style={labelStyle}>Channel Access Token</label>
          <input
            type="text"
            value={form.am_token ?? ''}
            onChange={e => set('am_token', e.target.value)}
            placeholder="輸入上午場 LINE Channel Access Token"
            className="w-full px-3 py-2 text-sm rounded-lg"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={labelStyle}>Group ID</label>
          <input
            type="text"
            value={form.am_group_id ?? ''}
            onChange={e => set('am_group_id', e.target.value)}
            placeholder="輸入上午場 LINE Group ID"
            className="w-full px-3 py-2 text-sm rounded-lg"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      {/* 下午場 */}
      <div className="rounded-xl p-4 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">下午場通知</div>
            <div className="text-xs mt-0.5" style={labelStyle}>廠商上傳後，在區間內發送 LINE 訊息</div>
          </div>
          <button
            onClick={() => set('pm_enabled', !form.pm_enabled)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: form.pm_enabled ? 'var(--accent)' : 'var(--border)' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm"
              style={{ left: form.pm_enabled ? '26px' : '2px' }}
            />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1" style={labelStyle}>通知區間起始</label>
            <select
              value={form.pm_start}
              onChange={e => set('pm_start', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {PM_START_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={labelStyle}>通知區間結束</label>
            <select
              value={form.pm_end}
              onChange={e => set('pm_end', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {PM_END_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1" style={labelStyle}>Channel Access Token</label>
          <input
            type="text"
            value={form.pm_token ?? ''}
            onChange={e => set('pm_token', e.target.value)}
            placeholder="輸入下午場 LINE Channel Access Token"
            className="w-full px-3 py-2 text-sm rounded-lg"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={labelStyle}>Group ID</label>
          <input
            type="text"
            value={form.pm_group_id ?? ''}
            onChange={e => set('pm_group_id', e.target.value)}
            placeholder="輸入下午場 LINE Group ID"
            className="w-full px-3 py-2 text-sm rounded-lg"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
        style={{ background: saved ? '#16a34a' : 'var(--accent)' }}
      >
        {saved ? '✓ 已儲存' : saving ? '儲存中...' : '儲存設定'}
      </button>
    </div>
  )
}
