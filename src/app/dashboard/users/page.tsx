'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Account } from '@/types'
import Modal from '@/components/Modal'

const ROLE_LABELS: Record<string, string> = { superadmin: '超級管理員', user: '使用者' }
const ROLE_COLORS: Record<string, string> = { superadmin: '#7c3aed', user: '#2563eb' }

const ROLE_DESCRIPTIONS = [
  { role: 'superadmin', label: '超級管理員', icon: '🔥', desc: '完整系統管理權限，可管理使用者、設定日報、匯出備份' },
  { role: 'user', label: '使用者', icon: '👤', desc: '可查看看板、管理廠商、查看歷史紀錄' },
]

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState({ account: '', password: '', display_name: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 取得當前使用者
    fetch('/api/auth').then(() => {}).catch(() => {})

    fetch('/api/users').then(async res => {
      if (res.status === 403) { router.push('/dashboard'); return }
      const data = await res.json()
      if (res.ok) setUsers(data.users)
      setLoading(false)
    })
  }, [router])

  function openAdd() {
    setEditing(null)
    setForm({ account: '', password: '', display_name: '', role: 'user' })
    setError('')
    setShowModal(true)
  }

  function openEdit(u: Account) {
    setEditing(u)
    setForm({ account: u.account, password: '', display_name: u.display_name, role: u.role })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.account || !form.display_name) { setError('請填寫帳號和顯示名稱'); return }
    if (!editing && !form.password) { setError('新增使用者需要設定密碼'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(editing ? `/api/users/${editing.id}` : '/api/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false)
      const res2 = await fetch('/api/users')
      const d2 = await res2.json()
      if (res2.ok) setUsers(d2.users)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(u: Account) {
    if (!confirm(`確定要刪除使用者「${u.display_name}」？`)) return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    const res2 = await fetch('/api/users')
    const d2 = await res2.json()
    if (res2.ok) setUsers(d2.users)
  }

  const filtered = users.filter(u =>
    u.account.includes(search) || u.display_name.includes(search)
  )

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">使用者管理</h2>
        <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
          + 新增使用者
        </button>
      </div>

      {/* 權限說明卡 */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>權限說明</div>
        {ROLE_DESCRIPTIONS.map(r => (
          <div key={r.role} className="flex gap-2 text-sm">
            <span>{r.icon}</span>
            <div>
              <span className="font-medium text-white">{r.label}</span>
              <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>{r.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜尋使用者..."
        className="w-full px-4 py-2.5 text-sm rounded-xl"
      />

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>載入中...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div
              key={u.id}
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{u.display_name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role] }}
                  >
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>帳號：{u.account}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(u)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ background: '#2d1a1a', color: '#f87171', border: '1px solid #7f1d1d' }}
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        title={editing ? '編輯使用者' : '新增使用者'}
        onClose={() => setShowModal(false)}
        onConfirm={handleSave}
        loading={saving}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>顯示名稱 *</label>
            <input className="w-full px-3 py-2 text-sm rounded-lg" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="例：工程師小王" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>登入帳號 *</label>
            <input className="w-full px-3 py-2 text-sm rounded-lg" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} placeholder="請輸入帳號" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>密碼 {editing ? '（留空則不修改）' : '*'}</label>
            <input type="password" className="w-full px-3 py-2 text-sm rounded-lg" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editing ? '留空不修改' : '請設定密碼'} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>角色</label>
            <select className="w-full px-3 py-2 text-sm rounded-lg" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">使用者</option>
              <option value="superadmin">超級管理員</option>
            </select>
          </div>
          {error && <div className="text-xs text-center py-2 rounded" style={{ background: '#2d1a1a', color: '#f87171' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )
}
