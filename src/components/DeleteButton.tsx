'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const danger: React.CSSProperties = { background: '#b91c1c', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }

export default function DeleteButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function del() {
    setBusy(true)
    const res = await fetch('/api/records/batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], op: 'delete' }),
    })
    if (res.ok) { router.push('/dashboard'); router.refresh() }
    else { setBusy(false); alert('刪除失敗') }
  }

  if (!confirm) return <button onClick={() => setConfirm(true)} style={ghost}>刪除此筆</button>
  return (
    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: '#fca5a5', fontSize: 13 }}>確定刪除？照片一併移除、無法復原</span>
      <button disabled={busy} onClick={del} style={danger}>確定刪除</button>
      <button disabled={busy} onClick={() => setConfirm(false)} style={ghost}>取消</button>
    </span>
  )
}
