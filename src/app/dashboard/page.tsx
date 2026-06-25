import Link from 'next/link'
import Nav from '@/components/Nav'
import RecordsTable from '@/components/RecordsTable'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { getCurrentWeekRange } from '@/lib/utils'
import { getAuthUser } from '@/lib/auth'
import { scopeContractor, isAdmin } from '@/lib/access'

export const dynamic = 'force-dynamic'

const AREAS = ['3200區1.5F EL03500', '2100區1.5F EL03800', '1100區2F EL04500', '2100區1.5F EL04600', '1100區3F EL08800', '2100區2F EL08800', '1100區4F EL14300', '1100區5F EL18800']
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
const inp: React.CSSProperties = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }

export default async function DashboardPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await getAuthUser()
  const admin = isAdmin(user)

  const week = getCurrentWeekRange()
  const start = searchParams.start || week.start
  const end = searchParams.end || week.end
  const fStatus = searchParams.status || ''
  const fContractor = admin ? (searchParams.contractor || '') : ''  // vendor 不可自選廠商
  const fArea = searchParams.area || ''

  const db = createServerClient()
  let q = db.from(TABLE).select('*').gte('work_date', start).lte('work_date', end)
  q = scopeContractor(q, user)                       // vendor 強制只看自己 contractor
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

  const recordRows = rows.map(r => ({
    id: r.id, work_date: r.work_date, contractor: r.contractor, knows_hole: r.knows_hole,
    serial: r.serial, hole_short: r.hole_short, area: r.area, grid_x: r.grid_x, grid_y: r.grid_y,
    location_note: r.location_note, size_label: r.size_label, status: r.status,
    photos: [
      { label: '完工', path: r.photo_done_path },
      { label: '遠', path: r.photo_far_path },
      { label: '近', path: r.photo_near_path },
    ].map(x => ({ label: x.label, url: x.path ? signed.get(x.path) : undefined }))
      .filter((x): x is { label: string; url: string } => !!x.url),
  }))

  const pending = rows.filter(r => r.status !== '已寄').length
  const sent = rows.filter(r => r.status === '已寄').length
  const zipQs = new URLSearchParams({ start, end, ...(fStatus && { status: fStatus }), ...(fContractor && { contractor: fContractor }), ...(fArea && { area: fArea }) }).toString()

  return (
    <>
      <Nav user={user} />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>上傳總覽{!admin && user?.contractor ? `（${user.contractor}）` : ''}</h1>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{start} ～ {end}</span>
        </header>

        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0' }}>
          <input type="date" name="start" defaultValue={start} style={inp} />
          <span style={{ color: 'var(--text-secondary)' }}>～</span>
          <input type="date" name="end" defaultValue={end} style={inp} />
          <select name="status" defaultValue={fStatus} style={inp}>
            <option value="">狀態(全部)</option><option value="待寄">待寄</option><option value="已寄">已寄</option>
          </select>
          {admin && (
            <select name="contractor" defaultValue={fContractor} style={inp}>
              <option value="">廠商(全部)</option>{CONTRACTORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
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
            <a href={`/api/export/photos?${zipQs}`} style={{ ...card, display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>⬇ 照片打包(zip)</a>
          )}
          {rows.length > 0 && (
            <a href={`/api/export/data?${zipQs}`} style={{ ...card, display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>⬇ 匯出資料(Excel)</a>
          )}
        </section>

        {error && <p style={{ color: '#f87171' }}>讀取失敗：{error.message}</p>}

        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', marginTop: 20 }}>此範圍尚無上傳資料。</p>
        ) : (
          <RecordsTable rows={recordRows} canManage={admin} />
        )}
      </main>
    </>
  )
}
