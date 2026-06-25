'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PhotoCell from './PhotoCell'

export type RecordRow = {
  id: string
  work_date: string
  contractor: string | null
  knows_hole: boolean
  serial: string | null
  hole_short: string | null
  area: string | null
  grid_x: string | null
  grid_y: string | null
  location_note: string | null
  size_label: string | null
  status: string
  photos: { label: string; url: string }[]
}

const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, verticalAlign: 'top' }
const th: React.CSSProperties = { ...td, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }
const barBtn: React.CSSProperties = { background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }
const danger: React.CSSProperties = { background: '#b91c1c', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

function Badge({ status }: { status: string }) {
  const sent = status === '已寄'
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: sent ? 'rgba(74,222,128,.15)' : 'rgba(251,146,60,.15)', color: sent ? '#4ade80' : '#fb923c' }}>{sent ? '已寄' : '待寄'}</span>
}

// canManage：superadmin 才有勾選/批次（標記已寄/待寄/刪除）；vendor 只能看 + 進明細編輯。
export default function RecordsTable({ rows, canManage = false }: { rows: RecordRow[]; canManage?: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const router = useRouter()

  const allSelected = rows.length > 0 && sel.size === rows.length
  const toggle = (id: string) => { const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); setSel(n); setConfirmDel(false) }
  const toggleAll = () => { setSel(allSelected ? new Set() : new Set(rows.map(r => r.id))); setConfirmDel(false) }

  async function batch(op: string) {
    if (sel.size === 0) return
    setBusy(true)
    const res = await fetch('/api/records/batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(sel), op }),
    })
    setBusy(false)
    setConfirmDel(false)
    if (res.ok) { setSel(new Set()); router.refresh() } else { alert('操作失敗') }
  }

  return (
    <>
      {canManage && sel.size > 0 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
          <span style={{ fontSize: 14 }}>已選 <b>{sel.size}</b> 筆</span>
          <button disabled={busy} onClick={() => batch('已寄')} style={barBtn}>標記已寄</button>
          <button disabled={busy} onClick={() => batch('待寄')} style={ghost}>標記待寄</button>
          {!confirmDel ? (
            <button disabled={busy} onClick={() => setConfirmDel(true)} style={danger}>刪除…</button>
          ) : (
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#fca5a5', fontSize: 13 }}>確定刪除 {sel.size} 筆？照片一併移除、無法復原</span>
              <button disabled={busy} onClick={() => batch('delete')} style={danger}>確定刪除</button>
              <button disabled={busy} onClick={() => setConfirmDel(false)} style={ghost}>取消</button>
            </span>
          )}
          <button onClick={() => setSel(new Set())} style={{ ...ghost, marginLeft: 'auto' }}>清除選取</button>
        </div>
      )}

      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {canManage && <th style={{ ...th, width: 32 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="全選" /></th>}
            <th style={th}>施工日</th><th style={th}>廠商</th><th style={th}>孔號 / 位置</th>
            <th style={th}>區域・格線</th><th style={th}>尺寸</th><th style={th}>狀態</th><th style={th}>照片</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={canManage && sel.has(r.id) ? { background: 'rgba(59,130,246,.08)' } : undefined}>
                {canManage && <td style={td}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label="選取" /></td>}
                <td style={td}>{r.work_date}</td>
                <td style={td}>{r.contractor || '—'}</td>
                <td style={td}>{r.knows_hole ? <span style={{ fontFamily: 'monospace' }}>{r.hole_short || r.serial || '—'}</span> : <span style={{ color: 'var(--text-secondary)' }}>{r.location_note || '（不知道孔號）'}</span>}</td>
                <td style={td}>{r.area || '—'} {r.grid_x}{r.grid_y}</td>
                <td style={td}>{r.size_label || '—'}</td>
                <td style={td}><Badge status={r.status} /></td>
                <td style={td}><PhotoCell photos={r.photos} /></td>
                <td style={td}><Link href={`/dashboard/${r.id}`} style={{ color: 'var(--accent)', fontSize: 13 }}>{canManage ? '明細' : '明細／編輯'}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
