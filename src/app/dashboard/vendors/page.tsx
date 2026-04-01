'use client'

import { useState, useEffect } from 'react'
import type { Vendor } from '@/types'
import Modal from '@/components/Modal'

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState({ name: '', contact: '', account: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  async function fetchVendors() {
    const res = await fetch('/api/vendors')
    const data = await res.json()
    if (res.ok) setVendors(data.vendors)
    setLoading(false)
  }

  useEffect(() => {
    fetchVendors()
    fetch('/api/auth').then(async res => {
      if (res.ok) {
        const data = await res.json()
        setIsSuperAdmin(data.user?.role === 'superadmin')
      }
    })
  }, [])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', contact: '', account: '', password: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(v: Vendor) {
    setEditing(v)
    setForm({ name: v.name, contact: v.contact || '', account: v.account, password: '' })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.account) { setError('請填寫名稱和帳號'); return }
    if (!editing && !form.password) { setError('新增廠商需要設定密碼'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(editing ? `/api/vendors/${editing.id}` : '/api/vendors', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false)
      fetchVendors()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定要刪除廠商「${name}」？\n相關照片也會一併刪除。`)) return
    const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
    if (res.ok) fetchVendors()
  }

  const filtered = vendors.filter(v =>
    v.name.includes(search) || v.account.includes(search) || (v.contact || '').includes(search)
  )

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">廠商管理</h2>
        {isSuperAdmin && (
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--accent)' }}
        >
          + 新增廠商
        </button>
        )}
      </div>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜尋廠商名稱、帳號..."
        className="w-full px-4 py-2.5 text-sm rounded-xl"
      />

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>載入中...</div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {search ? '沒有符合的廠商' : '尚未新增廠商'}
            </div>
          ) : filtered.map(v => (
            <div
              key={v.id}
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div>
                <div className="font-medium text-white">{v.name}</div>
                <div className="text-xs mt-0.5 space-x-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>帳號：{v.account}</span>
                  {v.contact && <span>聯絡：{v.contact}</span>}
                </div>
              </div>
              {isSuperAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(v)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDelete(v.id, v.name)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ background: '#2d1a1a', color: '#f87171', border: '1px solid #7f1d1d' }}
                >
                  刪除
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        title={editing ? '編輯廠商' : '新增廠商'}
        onClose={() => setShowModal(false)}
        onConfirm={handleSave}
        loading={saving}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>廠商名稱 *</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="請輸入廠商名稱"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>聯絡資訊</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg"
              value={form.contact}
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              placeholder="電話或聯絡人"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>登入帳號 *</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg"
              value={form.account}
              onChange={e => setForm(f => ({ ...f, account: e.target.value }))}
              placeholder="廠商登入帳號"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              密碼 {editing ? '（留空則不修改）' : '*'}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 text-sm rounded-lg"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={editing ? '留空不修改' : '請設定密碼'}
            />
          </div>
          {error && <div className="text-xs text-center py-2 rounded" style={{ background: '#2d1a1a', color: '#f87171' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )
}
