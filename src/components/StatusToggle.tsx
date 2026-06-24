'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const btn: React.CSSProperties = { background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }

export default function StatusToggle({ id, status }: { id: string; status: string }) {
  const [cur, setCur] = useState(status === '已寄' ? '已寄' : '待寄')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function set(next: string) {
    setBusy(true)
    const res = await fetch(`/api/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setBusy(false)
    if (res.ok) {
      setCur(next)
      router.refresh()
    } else {
      alert('更新失敗')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 14 }}>狀態：<b>{cur}</b></span>
      {cur === '待寄'
        ? <button disabled={busy} onClick={() => set('已寄')} style={btn}>標記為已寄</button>
        : <button disabled={busy} onClick={() => set('待寄')} style={ghost}>改回待寄</button>}
    </div>
  )
}
