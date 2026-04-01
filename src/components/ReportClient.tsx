'use client'
import { useState, useEffect } from 'react'
import type { AuthUser, ReportConfig, ReportEmail } from '@/types'

export default function ReportClient({ user }: { user: AuthUser }) {
  const [, setConfig] = useState<ReportConfig | null>(null)
  const [emails, setEmails] = useState<ReportEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [form, setForm] = useState({ enabled: true, am_time: '09:00', pm_time: '15:00' })
  const [saved, setSaved] = useState(false)

  const isSuperAdmin = user.role === 'superadmin'

  useEffect(() => {
    Promise.all([
      fetch('/api/report-config').then(r => r.json()),
      fetch('/api/report-emails').then(r => r.json()),
    ]).then(([c, e]) => {
      if (c.config) { setConfig(c.config); setForm({ enabled: c.config.enabled, am_time: c.config.am_time, pm_time: c.config.pm_time }) }
      if (e.emails) setEmails(e.emails)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/report-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) { setConfig(data.config); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } finally {
      setSaving(false)
    }
  }

  async function handleAddEmail() {
    if (!newEmail || !newEmail.includes('@')) return
    setAddingEmail(true)
    try {
      const res = await fetch('/api/report-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await res.json()
      if (res.ok) { setEmails(prev => [...prev, data.email]); setNewEmail('') }
      else alert(data.error)
    } finally {
      setAddingEmail(false)
    }
  }

  async function handleDeleteEmail(id: string) {
    const res = await fetch(`/api/report-emails/${id}`, { method: 'DELETE' })
    if (res.ok) setEmails(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>載入中...</div>

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-white">日報設定</h2>
      {!isSuperAdmin && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#1a2030', color: '#94a3b8' }}>
          目前為唯讀模式，僅 superadmin 可修改設定
        </div>
      )}
      <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">啟用自動日報</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>每天自動寄送酒測回報統計</div>
          </div>
          <button
            onClick={() => isSuperAdmin && setForm(f => ({ ...f, enabled: !f.enabled }))}
            disabled={!isSuperAdmin}
            className="relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: form.enabled ? 'var(--accent)' : 'var(--border)' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm"
              style={{ left: form.enabled ? '26px' : '2px' }}
            />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>早上場寄送時間</label>
            <input
              type="time"
              value={form.am_time}
              onChange={e => isSuperAdmin && setForm(f => ({ ...f, am_time: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg"
              readOnly={!isSuperAdmin}
              disabled={!isSuperAdmin}
              style={{ opacity: isSuperAdmin ? 1 : 0.5 }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>下午場寄送時間</label>
            <input
              type="time"
              value={form.pm_time}
              onChange={e => isSuperAdmin && setForm(f => ({ ...f, pm_time: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg"
              readOnly={!isSuperAdmin}
              disabled={!isSuperAdmin}
              style={{ opacity: isSuperAdmin ? 1 : 0.5 }}
            />
          </div>
        </div>
        {isSuperAdmin && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
            style={{ background: saved ? '#16a34a' : 'var(--accent)' }}
          >
            {saved ? '✓ 已儲存' : saving ? '儲存中...' : '儲存設定'}
          </button>
        )}
      </div>
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="text-sm font-medium text-white mb-2">寄送時程預覽</div>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <div>• 早上場：每天 {form.am_time} 寄送</div>
          <div>• 下午場：每天 {form.pm_time} 寄送</div>
          <div className="mt-2 text-xs">內容包含：早上/下午/晚上場次，已回報/未回報廠商清單、回報人數統計</div>
        </div>
      </div>
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="font-medium text-white">收件人 Email</div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
              placeholder="輸入 Email 後按 Enter 或點新增"
              className="flex-1 px-3 py-2 text-sm rounded-lg"
            />
            <button
              onClick={handleAddEmail}
              disabled={addingEmail}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              新增
            </button>
          </div>
        )}
        {emails.length === 0 ? (
          <div className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>尚未設定收件人</div>
        ) : (
          <div className="space-y-2">
            {emails.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'var(--bg-primary)' }}>
                <span className="text-sm text-white">{e.email}</span>
                {isSuperAdmin && (
                  <button onClick={() => handleDeleteEmail(e.id)}
                    className="text-xs px-2 py-1 rounded" style={{ color: '#f87171' }}>
                    刪除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
