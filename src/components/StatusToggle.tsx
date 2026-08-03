'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isBilled, STATUS_BILLED, STATUS_UNBILLED } from '@/lib/status'

const btn: React.CSSProperties = { background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }

export default function StatusToggle({ id, status }: { id: string; status: string }) {
  const [cur, setCur] = useState(isBilled(status) ? STATUS_BILLED : STATUS_UNBILLED)
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
      {cur === STATUS_UNBILLED
        ? <button disabled={busy} onClick={() => set(STATUS_BILLED)} style={btn}>標記為已請款</button>
        : <button disabled={busy} onClick={() => set(STATUS_UNBILLED)} style={ghost}>改回未請款</button>}
    </div>
  )
}
