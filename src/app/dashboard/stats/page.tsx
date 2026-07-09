import Nav from '@/components/Nav'
import { createServerClient, TABLE } from '@/lib/supabase'
import { getCurrentWeekRange } from '@/lib/utils'
import { getAuthUser } from '@/lib/auth'
import { scopeContractor, isAdmin } from '@/lib/access'
import { flatbarWeightG, FLATBAR_SPEC } from '@/lib/holes'

export const dynamic = 'force-dynamic'

// 全案目標孔數（暫定，可調）—— 用於 admin 的整體進度％。實際數字待 Po 確認。
const TARGET_HOLES = 1200

type Row = {
  area: string | null
  perimeter_mm: number | null
  work_date: string | null
  flatbar_mm: number | null
  contractor: string | null
  status: string | null
}
type Agg = { key: string; wHoles: number; wMm: number; tHoles: number; tMm: number; tFb: number }

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', minWidth: 120, flex: '1 1 140px' }
const capt: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)' }
const big: React.CSSProperties = { fontSize: 26, fontWeight: 700 }
const unit: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }
const accent: React.CSSProperties = { fontSize: 14, color: 'var(--accent)', fontWeight: 600 }
const td: React.CSSProperties = { padding: '10px 10px', borderBottom: '1px solid var(--border)', fontSize: 14, verticalAlign: 'middle' }
const th: React.CSSProperties = { ...td, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'left', fontSize: 13, whiteSpace: 'nowrap' }
const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const numh: React.CSSProperties = { ...th, textAlign: 'right' }

const m = (mm: number) => (mm / 1000).toFixed(2)
const kg = (mm: number) => { const g = flatbarWeightG(mm); return g ? (g / 1000).toFixed(1) : '0.0' }

// 從本週週一往回推 n 週，回傳 [{start,end,label}]（舊→新），label 為 MM/DD
function lastNWeeks(mondayStr: string, n: number) {
  const base = new Date(mondayStr + 'T00:00:00Z')
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const out: { start: string; end: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const mon = new Date(base); mon.setUTCDate(base.getUTCDate() - 7 * i)
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
    out.push({ start: fmt(mon), end: fmt(sun), label: fmt(mon).slice(5).replace('-', '/') })
  }
  return out
}

export default async function StatsPage() {
  const user = await getAuthUser()
  const admin = isAdmin(user)
  const week = getCurrentWeekRange()

  const db = createServerClient()
  let q = db.from(TABLE).select('area, perimeter_mm, work_date, flatbar_mm, contractor, status')
  q = scopeContractor(q, user)            // vendor 只統計自己 contractor
  const { data, error } = await q
  const rows = (data || []) as Row[]

  // 各區域彙總
  const map = new Map<string, Agg>()
  const contractors = new Map<string, Agg>()
  const totals = { wHoles: 0, wMm: 0, tHoles: 0, tMm: 0, tFb: 0, pending: 0, sent: 0 }
  for (const r of rows) {
    const inWeek = !!r.work_date && r.work_date >= week.start && r.work_date <= week.end
    const mm = r.perimeter_mm || 0
    const fb = r.flatbar_mm || 0

    const area = r.area || '未分區'
    const a = map.get(area) || { key: area, wHoles: 0, wMm: 0, tHoles: 0, tMm: 0, tFb: 0 }
    a.tHoles += 1; a.tMm += mm; a.tFb += fb
    if (inWeek) { a.wHoles += 1; a.wMm += mm }
    map.set(area, a)

    const cn = r.contractor || '未填'
    const c = contractors.get(cn) || { key: cn, wHoles: 0, wMm: 0, tHoles: 0, tMm: 0, tFb: 0 }
    c.tHoles += 1; c.tMm += mm; c.tFb += fb
    if (inWeek) { c.wHoles += 1; c.wMm += mm }
    contractors.set(cn, c)

    totals.tHoles += 1; totals.tMm += mm; totals.tFb += fb
    if (inWeek) { totals.wHoles += 1; totals.wMm += mm }
    if (r.status === '已寄') totals.sent += 1; else totals.pending += 1
  }
  const aggs = Array.from(map.values()).sort((x, y) => y.tMm - x.tMm)
  const conAggs = Array.from(contractors.values()).sort((x, y) => y.tHoles - x.tHoles)
  const maxTm = Math.max(1, ...aggs.map(a => a.tMm))

  // 近 8 週趨勢
  const weeks = lastNWeeks(week.start, 8)
  const trend = weeks.map(w => ({
    label: w.label,
    holes: rows.filter(r => r.work_date && r.work_date >= w.start && r.work_date <= w.end).length,
  }))
  const maxTrend = Math.max(1, ...trend.map(t => t.holes))

  const pct = Math.min(100, Math.round(totals.tHoles / TARGET_HOLES * 100))

  return (
    <>
      <Nav user={user} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>進度儀表板{!admin && user?.contractor ? `（${user.contractor}）` : ''}</h1>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>本週 {week.start} ～ {week.end}</span>
        </header>

        {error && <p style={{ color: '#f87171' }}>讀取失敗：{error.message}</p>}

        {/* admin：整體進度 vs 目標 */}
        {admin && (
          <section style={{ ...card, margin: '16px 0 0', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <span style={capt}>整體進度（目標暫定 {TARGET_HOLES} 孔，可調）</span>
              <span style={accent}>{totals.tHoles} / {TARGET_HOLES}　{pct}%</span>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 6, height: 14, overflow: 'hidden', border: '1px solid var(--border)', marginTop: 8 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', minWidth: totals.tHoles > 0 ? 2 : 0 }} />
            </div>
          </section>
        )}

        {/* 總覽卡片 */}
        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
          <div style={card}><div style={capt}>本週完成</div><div style={big}>{totals.wHoles} <span style={unit}>孔</span></div><div style={accent}>{m(totals.wMm)} m</div></div>
          <div style={card}><div style={capt}>累積完成</div><div style={big}>{totals.tHoles} <span style={unit}>孔</span></div><div style={accent}>{m(totals.tMm)} m</div></div>
          <div style={card}><div style={capt}>累積扁鐵（{FLATBAR_SPEC}）</div><div style={big}>{m(totals.tFb)} <span style={unit}>m</span></div><div style={accent}>約 {kg(totals.tFb)} kg</div></div>
          <div style={card}><div style={capt}>寄送狀態</div><div style={{ ...big, fontSize: 20 }}>待寄 {totals.pending}<span style={{ ...unit, margin: '0 6px' }}>/</span>已寄 {totals.sent}</div></div>
        </section>

        {/* 近 8 週趨勢 */}
        {totals.tHoles > 0 && (
          <section style={{ ...card, minWidth: 0, marginBottom: 16 }}>
            <div style={capt}>近 8 週完成孔數</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginTop: 10 }}>
              {trend.map((t, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{t.holes || ''}</span>
                  <div style={{ width: '100%', maxWidth: 34, height: `${Math.round(t.holes / maxTrend * 64)}px`, minHeight: t.holes > 0 ? 3 : 0, background: i === trend.length - 1 ? 'var(--accent)' : 'var(--border)', borderRadius: 3 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 各廠商（admin 才顯示；vendor 只看得到自己，無意義） */}
        {admin && conAggs.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 8px', color: 'var(--text-secondary)' }}>各廠商</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>廠商</th><th style={numh}>本週孔</th><th style={numh}>累積孔</th><th style={numh}>累積米</th><th style={numh}>扁鐵 m</th>
                </tr></thead>
                <tbody>
                  {conAggs.map(c => (
                    <tr key={c.key}>
                      <td style={td}>{c.key}</td>
                      <td style={num}>{c.wHoles || '—'}</td>
                      <td style={num}>{c.tHoles}</td>
                      <td style={{ ...num, fontWeight: 600 }}>{m(c.tMm)}</td>
                      <td style={num}>{c.tFb ? m(c.tFb) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 各區域明細 */}
        <h2 style={{ fontSize: 15, margin: '0 0 8px', color: 'var(--text-secondary)' }}>各區域</h2>
        {aggs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>尚無資料。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>區域</th>
                <th style={numh}>本週孔</th>
                <th style={numh}>本週米</th>
                <th style={numh}>累積孔</th>
                <th style={numh}>累積米</th>
                <th style={numh}>扁鐵 m</th>
                <th style={{ ...th, width: '28%' }}>累積進度</th>
              </tr></thead>
              <tbody>
                {aggs.map(a => (
                  <tr key={a.key}>
                    <td style={td}>{a.key}</td>
                    <td style={num}>{a.wHoles || '—'}</td>
                    <td style={num}>{a.wMm ? m(a.wMm) : '—'}</td>
                    <td style={num}>{a.tHoles}</td>
                    <td style={{ ...num, fontWeight: 600 }}>{m(a.tMm)}</td>
                    <td style={num}>{a.tFb ? m(a.tFb) : '—'}</td>
                    <td style={td}>
                      <div style={{ background: 'var(--bg-primary)', borderRadius: 6, height: 18, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ width: `${Math.round(a.tMm / maxTm * 100)}%`, height: '100%', background: 'var(--accent)', minWidth: a.tMm > 0 ? 2 : 0 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...td, fontWeight: 700 }}>合計</td>
                  <td style={{ ...num, fontWeight: 700 }}>{totals.wHoles}</td>
                  <td style={{ ...num, fontWeight: 700 }}>{m(totals.wMm)}</td>
                  <td style={{ ...num, fontWeight: 700 }}>{totals.tHoles}</td>
                  <td style={{ ...num, fontWeight: 700 }}>{m(totals.tMm)}</td>
                  <td style={{ ...num, fontWeight: 700 }}>{m(totals.tFb)}</td>
                  <td style={td} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 10 }}>※ 孔＝上傳筆數；米＝周長合計（perimeter_mm÷1000）；扁鐵＝{FLATBAR_SPEC} 長度合計，重量約算（{'0.883'} kg/m）。本週依施工日期落在 {week.start}～{week.end}（台灣時間）。</p>
      </main>
    </>
  )
}
