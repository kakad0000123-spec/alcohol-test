import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/components/Nav'
import StatusToggle from '@/components/StatusToggle'
import DeleteButton from '@/components/DeleteButton'
import EditRecordForm from '@/components/EditRecordForm'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { photoFileName, type PhotoKind } from '@/lib/naming'
import { getAuthUser } from '@/lib/auth'
import { isAdmin, ownsContractorRow } from '@/lib/access'
import { flatbarWeightG } from '@/lib/holes'

export const dynamic = 'force-dynamic'

const cell: React.CSSProperties = { padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }
const keyCell: React.CSSProperties = { ...cell, color: 'var(--text-secondary)', width: 130, verticalAlign: 'top' }

export default async function DetailPage({ params }: { params: { id: string } }) {
  const user = await getAuthUser()
  const admin = isAdmin(user)

  const db = createServerClient()
  const { data: r } = await db.from(TABLE).select('*').eq('id', params.id).single()
  if (!r) notFound()
  // vendor 只能看自己廠商的資料；猜別人的 id 一律 404（fail-closed，不洩漏存在與否）
  if (!ownsContractorRow(user, r.contractor)) notFound()

  const photoDefs = [
    { k: 'done' as PhotoKind, label: '完工照', path: r.photo_done_path as string | null },
    { k: 'far' as PhotoKind, label: '遠照', path: r.photo_far_path as string | null },
    { k: 'near' as PhotoKind, label: '近照', path: r.photo_near_path as string | null },
  ].filter(p => p.path)

  const photos = await Promise.all(photoDefs.map(async p => {
    const path = p.path as string
    const prev = await db.storage.from(BUCKET).createSignedUrl(path, 600)
    const fname = photoFileName(r, p.k)
    const dl = await db.storage.from(BUCKET).createSignedUrl(path, 600, { download: fname })
    return { label: p.label, fname, preview: prev.data?.signedUrl, download: dl.data?.signedUrl }
  }))

  const fields: [string, React.ReactNode][] = [
    ['施工日期', r.work_date],
    ['廠商', r.contractor || '—'],
    ['知道孔號', r.knows_hole ? '是' : '否'],
    ['完整孔號', r.hole_short || r.serial || '—'],
    ['區域', r.area || '—'],
    ['格線', `${r.grid_x || ''}${r.grid_y || ''}` || '—'],
    ['位置說明', r.location_note || '—'],
    ['形狀', r.shape || '—'],
    ['尺寸', r.size_label || '—'],
    ['周長(mm)', r.perimeter_mm ?? '—'],
    ['扁鐵補修', r.flatbar_mm != null ? `${r.flatbar_mm} mm（≈ ${flatbarWeightG(r.flatbar_mm)} g）` : '—'],
    ['備註', r.size_note || '—'],
    ['上傳時間', r.created_at ? new Date(r.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '—'],
  ]

  return (
    <>
      <Nav user={user} />
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '20px' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>← 回總覽</Link>
        <h1 style={{ fontSize: 20, margin: '8px 0 16px' }}>{r.hole_short || r.location_note || '上傳明細'}</h1>

        {admin && (
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusToggle id={r.id} status={r.status} />
            <DeleteButton id={r.id} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <table style={{ borderCollapse: 'collapse', flex: '1 1 300px', alignSelf: 'flex-start' }}>
            <tbody>
              {fields.map(([k, v]) => (
                <tr key={k}><td style={keyCell}>{k}</td><td style={cell}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <div style={{ flex: '1 1 320px' }}>
            {photos.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>無照片</p> : photos.map(p => (
              <div key={p.label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{p.label} — {p.fname}</div>
                {p.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt={p.label} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                )}
                {p.download && (
                  <div style={{ marginTop: 6 }}>
                    <a href={p.download} style={{ color: 'var(--accent)', fontSize: 13 }}>下載（{p.fname}）</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <EditRecordForm initial={{
            id: r.id,
            knows_hole: !!r.knows_hole,
            work_date: r.work_date,
            area: r.area,
            grid_x: r.grid_x,
            grid_y: r.grid_y,
            serial: r.serial,
            location_note: r.location_note,
            shape: r.shape,
            dia_mm: r.dia_mm,
            width_mm: r.width_mm,
            height_mm: r.height_mm,
            size_note: r.size_note,
            flatbar_raw: r.flatbar_raw,
          }} />
        </div>
      </main>
    </>
  )
}
