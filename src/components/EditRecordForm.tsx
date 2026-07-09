'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { computePerim, fullHoleCode, parseFlatbar, flatbarWeightG } from '@/lib/holes'

export type EditInitial = {
  id: string
  knows_hole: boolean
  work_date: string | null
  area: string | null
  grid_x: string | null
  grid_y: string | null
  serial: string | null
  location_note: string | null
  shape: string | null
  dia_mm: number | null
  width_mm: number | null
  height_mm: number | null
  size_note: string | null
  flatbar_raw: string | null
}

const AREAS = ['3200區1.5F EL03500', '2100區1.5F EL03800', '1100區2F EL04500', '2100區1.5F EL04600', '1100區3F EL08800', '2100區2F EL08800', '1100區4F EL14300', '1100區5F EL18800']

const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, width: '100%' }
const lab: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }
const row: React.CSSProperties = { marginBottom: 12 }
const btn: React.CSSProperties = { background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 6, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }

export default function EditRecordForm({ initial }: { initial: EditInitial }) {
  const router = useRouter()
  const [f, setF] = useState({
    work_date: initial.work_date || '',
    area: initial.area || '',
    grid_x: initial.grid_x || '',
    grid_y: initial.grid_y || '',
    serial: initial.serial || '',
    location_note: initial.location_note || '',
    shape: initial.shape || '',
    dia_mm: initial.dia_mm != null ? String(initial.dia_mm) : '',
    width_mm: initial.width_mm != null ? String(initial.width_mm) : '',
    height_mm: initial.height_mm != null ? String(initial.height_mm) : '',
    size_note: initial.size_note || '',
    flatbar_raw: initial.flatbar_raw || '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setMsg('') }

  // 即時預覽（伺服器存檔時會以同一套規則重算為準）
  const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null }
  const perim = computePerim(f.shape, num(f.dia_mm), num(f.width_mm), num(f.height_mm))
  const fb = parseFlatbar(f.flatbar_raw)
  const code = initial.knows_hole ? fullHoleCode(f.area, f.grid_x, f.grid_y, f.serial) : null

  const areaOptions = AREAS.includes(f.area) || !f.area ? AREAS : [f.area, ...AREAS]

  async function save() {
    if (parseFlatbar(f.flatbar_raw).state === 'invalid') { setMsg('扁鐵格式只能用數字、＋、＊') ; return }
    setBusy(true)
    setMsg('')
    const payload = {
      work_date: f.work_date || null,
      area: f.area || null,
      grid_x: f.grid_x || null,
      grid_y: f.grid_y || null,
      shape: f.shape || null,
      dia_mm: f.shape === '圓' ? num(f.dia_mm) : null,
      width_mm: f.shape === '矩' ? num(f.width_mm) : null,
      height_mm: f.shape === '矩' ? num(f.height_mm) : null,
      size_note: f.size_note.trim() || null,
      flatbar_raw: f.flatbar_raw.trim() || null,
      ...(initial.knows_hole ? { serial: f.serial.trim() || null } : { location_note: f.location_note.trim() || null }),
    }
    const res = await fetch(`/api/records/${initial.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (res.ok) { setMsg('已儲存'); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || '儲存失敗') }
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, maxWidth: 520 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>編輯（尺寸 + 位置）</h2>

      <div style={row}>
        <label style={lab}>施工日期</label>
        <input type="date" style={input} value={f.work_date} onChange={e => set('work_date', e.target.value)} />
      </div>

      <div style={row}>
        <label style={lab}>區域</label>
        <select style={input} value={f.area} onChange={e => set('area', e.target.value)}>
          <option value="">（未選）</option>
          {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ ...row, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lab}>格線 X</label><input style={input} value={f.grid_x} onChange={e => set('grid_x', e.target.value)} /></div>
        <div style={{ flex: 1 }}><label style={lab}>格線 Y</label><input style={input} value={f.grid_y} onChange={e => set('grid_y', e.target.value)} /></div>
      </div>

      {initial.knows_hole ? (
        <div style={row}>
          <label style={lab}>孔號末三碼</label>
          <input style={input} value={f.serial} onChange={e => set('serial', e.target.value)} placeholder="例 001" inputMode="numeric" />
          {code && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0' }}>完整孔號：<b style={{ fontFamily: 'monospace' }}>{code}</b></p>}
        </div>
      ) : (
        <div style={row}>
          <label style={lab}>位置說明</label>
          <input style={input} value={f.location_note} onChange={e => set('location_note', e.target.value)} />
        </div>
      )}

      <div style={row}>
        <label style={lab}>形狀</label>
        <select style={input} value={f.shape} onChange={e => set('shape', e.target.value)}>
          <option value="">（未選）</option>
          <option value="圓">圓</option>
          <option value="矩">矩</option>
        </select>
      </div>

      {f.shape === '圓' && (
        <div style={row}><label style={lab}>直徑 (mm)</label><input type="number" step="any" style={input} value={f.dia_mm} onChange={e => set('dia_mm', e.target.value)} /></div>
      )}
      {f.shape === '矩' && (
        <div style={{ ...row, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={lab}>寬 (mm)</label><input type="number" step="any" style={input} value={f.width_mm} onChange={e => set('width_mm', e.target.value)} /></div>
          <div style={{ flex: 1 }}><label style={lab}>高 (mm)</label><input type="number" step="any" style={input} value={f.height_mm} onChange={e => set('height_mm', e.target.value)} /></div>
        </div>
      )}

      {perim && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>尺寸：<b>{perim.size_label}</b>　周長 ≈ <b>{perim.perimeter_mm} mm</b>（{(perim.perimeter_mm / 1000).toFixed(2)} m）</p>}

      <div style={row}>
        <label style={lab}>尺寸備註</label>
        <input style={input} value={f.size_note} onChange={e => set('size_note', e.target.value)} />
      </div>

      <div style={row}>
        <label style={lab}>扁鐵補修（FB25×4.5，例 8*2+9+20*2）</label>
        <input style={input} value={f.flatbar_raw} onChange={e => set('flatbar_raw', e.target.value)} placeholder="沒有免填" />
        {fb.state === 'ok' && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0' }}>扁鐵 ≈ <b>{fb.mm} mm</b>（≈ {flatbarWeightG(fb.mm)} g）</p>}
        {fb.state === 'invalid' && <p style={{ fontSize: 12, color: '#f87171', margin: '6px 0 0' }}>格式只能用數字、＋、＊</p>}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
        <button onClick={save} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? '儲存中…' : '儲存'}</button>
        {msg && <span style={{ fontSize: 13, color: msg === '已儲存' ? '#4ade80' : '#f87171' }}>{msg}</span>}
      </div>
    </div>
  )
}
