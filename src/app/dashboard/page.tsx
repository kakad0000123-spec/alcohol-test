import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { getCurrentWeekRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

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
  shape: string | null
  size_label: string | null
  perimeter_mm: number | null
  status: string
  hole_id: string | null
  photo_done_path: string | null
  photo_far_path: string | null
  photo_near_path: string | null
}

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '14px 18px', minWidth: 120,
}
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, verticalAlign: 'top' }
const th: React.CSSProperties = { ...td, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string }
}) {
  const week = getCurrentWeekRange()
  const start = searchParams.start || week.start
  const end = searchParams.end || week.end

  const db = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false })

  const rows = (data || []) as Row[]

  // 收集所有照片路徑 → 一次換成簽名網址（私有桶，service_role 簽）
  const paths = rows.flatMap(r => [r.photo_done_path, r.photo_far_path, r.photo_near_path].filter(Boolean) as string[])
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(paths, 600)
    for (const u of urls || []) {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
    }
  }

  const count = (s: string) => rows.filter(r => r.status === s).length
  const byContractor = (c: string) => rows.filter(r => r.contractor === c).length

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>本週待核照片</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{start} ～ {end}（台灣時間）</span>
      </header>

      {error && (
        <p style={{ color: '#f87171', marginTop: 16 }}>讀取失敗：{error.message}（確認 Supabase 環境變數與 hole_uploads 表是否就緒）</p>
      )}

      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '18px 0 8px' }}>
        <div style={card}><div style={{ fontSize: 24, fontWeight: 700 }}>{rows.length}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>本週總筆數</div></div>
        <div style={card}><div style={{ fontSize: 24, fontWeight: 700 }}>{count('待核')}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>待核</div></div>
        <div style={card}><div style={{ fontSize: 24, fontWeight: 700 }}>{count('已配號')}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>已配號</div></div>
        <div style={card}><div style={{ fontSize: 24, fontWeight: 700 }}>{count('已寄出')}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>已寄出</div></div>
        <div style={card}><div style={{ fontSize: 24, fontWeight: 700 }}>基誠 {byContractor('基誠')}｜偉翔 {byContractor('偉翔')}</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>各廠商</div></div>
      </section>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', marginTop: 24 }}>本週尚無上傳資料。</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>施工日</th>
                <th style={th}>廠商</th>
                <th style={th}>孔號 / 位置</th>
                <th style={th}>區域・格線</th>
                <th style={th}>尺寸</th>
                <th style={th}>狀態</th>
                <th style={th}>照片</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const photos = [
                  { label: '完工', path: r.photo_done_path },
                  { label: '遠', path: r.photo_far_path },
                  { label: '近', path: r.photo_near_path },
                ].filter(p => p.path)
                return (
                  <tr key={r.id}>
                    <td style={td}>{r.work_date}</td>
                    <td style={td}>{r.contractor || '—'}</td>
                    <td style={td}>
                      {r.knows_hole
                        ? <span style={{ fontFamily: 'monospace' }}>{r.hole_short || r.serial || '—'}</span>
                        : <span style={{ color: 'var(--text-secondary)' }}>{r.location_note || '（不知道孔號）'}</span>}
                      {r.hole_id && <div style={{ fontSize: 11, color: '#4ade80', fontFamily: 'monospace' }}>{r.hole_id}</div>}
                    </td>
                    <td style={td}>{r.area || '—'} {r.grid_x}{r.grid_y}</td>
                    <td style={td}>{r.size_label || '—'}{r.perimeter_mm ? <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>周長 {r.perimeter_mm} mm</div> : null}</td>
                    <td style={td}>{r.status}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {photos.map(p => {
                          const url = signed.get(p.path as string)
                          return url ? (
                            <a key={p.label} href={url} target="_blank" rel="noreferrer" title={p.label}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={p.label} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                            </a>
                          ) : <span key={p.label} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.label}?</span>
                        })}
                        {photos.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>無</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 24 }}>
        第一週骨架：唯讀檢視。配號（hole_id）、改檔名、匯出 Excel、打包寄送、排程清除為後續開發（見 DEV_PLAN §4 待拍板項）。
      </p>
    </main>
  )
}
