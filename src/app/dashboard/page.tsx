import Link from 'next/link'
import Nav from '@/components/Nav'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { getCurrentWeekRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const AREAS = ['3200區EL03500', '2100區EL03800', '1100區EL04500', '2100區EL04600', '1100區EL08800', '1100區EL14300', '1100區EL18800']
const CONTRACTORS = ['基誠', '偉翔']

type Row = {
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
  photo_done_path: string | null
  photo_far_path: string | null
  photo_near_path: string | null
}

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 96 }
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, verticalAlign: 'top' }
const th: React.CSSProperties = { ...td, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }
const inp: React.CSSProperties = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }

export default async function DashboardPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const week = getCurrentWeekRange()
  const start = searchParams.start || week.start
  const end = searchParams.end || week.end
  const fStatus = searchParams.status || ''
  const fContractor = searchParams.contractor || ''
  const fArea = searchParams.area || ''

  const db = createServerClient()
  let q = db.from(TABLE).select('*').gte('work_date', start).lte('work_date', end)
  if (fStatus) q = q.eq('status', fStatus)
  if (fContractor) q = q.eq('contractor', fContractor)
  if (fArea) q = q.eq('area', fArea)
  const { data, error } = await q.order('work_date', { ascending: false }).order('created_at', { ascending: false })
  const rows = (data || []) as Row[]

  const paths = rows.flatMap(r => [r.photo_done_path, r.photo_far_path, r.photo_near_path].filter(Boolean) as string[])
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(paths, 600)
    for (const u of urls || []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }

  const pending = rows.filter(r => r.status !== '已寄').length
  const sent = rows.filter(r => r.status === '已寄').length
  const zipQs = new URLSearchParams({ start, end, ...(fStatus && { status: fStatus }), ...(fContractor && { contractor: fContractor }), ...(fArea && { area: fArea }) }).toString()

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>上傳總覽</h1>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{start} ～ {end}</span>
        </header>

        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0' }}>
          <input type="date" name="start" defaultValue={start} style={inp} />
          <span style={{ color: 'var(--text-secondary)' }}>～</span>
          <input type="date" name="end" defaultValue={end} style={inp} />
          <select name="status" defaultValue={fStatus} style={inp}>
            <option value="">狀態(全部)</option><option value="待寄">待寄</option><option value="已寄">已寄</option>
          </select>
          <select name="contractor" defaultValue={fContractor} style={inp}>
            <option value="">廠商(全部)</option>{CONTRACTORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="area" defaultValue={fArea} style={inp}>
            <option value="">區域(全部)</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="submit" style={{ ...inp, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>篩選</button>
          <Link href="/dashboard" style={{ ...inp, textDecoration: 'none', color: 'var(--text-secondary)' }}>重設</Link>
        </form>

        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={card}><div style={{ fontSize: 22, fontWeight: 700 }}>{rows.length}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>筆數</div></div>
          <div style={card}><div style={{ fontSize: 22, fontWeight: 700 }}>{pending}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>待寄</div></div>
          <div style={card}><div style={{ fontSize: 22, fontWeight: 700 }}>{sent}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>已寄</div></div>
          {rows.length > 0 && (
            <a href={`/api/export/photos?${zipQs}`} style={{ ...card, display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>⬇ 打包下載照片(zip)</a>
          )}
        </section>

        {error && <p style={{ color: '#f87171' }}>讀取失敗：{error.message}</p>}

        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', marginTop: 20 }}>此範圍尚無上傳資料。</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>施工日</th><th style={th}>廠商</th><th style={th}>孔號 / 位置</th>
                <th style={th}>區域・格線</th><th style={th}>尺寸</th><th style={th}>狀態</th><th style={th}>照片</th><th style={th}></th>
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const photos = [r.photo_done_path, r.photo_far_path, r.photo_near_path].filter(Boolean) as string[]
                  return (
                    <tr key={r.id}>
                      <td style={td}>{r.work_date}</td>
                      <td style={td}>{r.contractor || '—'}</td>
                      <td style={td}>{r.knows_hole ? <span style={{ fontFamily: 'monospace' }}>{r.hole_short || r.serial || '—'}</span> : <span style={{ color: 'var(--text-secondary)' }}>{r.location_note || '（不知道孔號）'}</span>}</td>
                      <td style={td}>{r.area || '—'} {r.grid_x}{r.grid_y}</td>
                      <td style={td}>{r.size_label || '—'}</td>
                      <td style={td}>{r.status === '已寄' ? '已寄' : '待寄'}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {photos.slice(0, 3).map((p, i) => {
                            const url = signed.get(p)
                            return url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                            ) : null
                          })}
                          {photos.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>無</span>}
                        </div>
                      </td>
                      <td style={td}><Link href={`/dashboard/${r.id}`} style={{ color: 'var(--accent)', fontSize: 13 }}>明細</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
