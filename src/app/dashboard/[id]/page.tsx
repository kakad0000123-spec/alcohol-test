import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/components/Nav'
import StatusToggle from '@/components/StatusToggle'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { photoFileName, type PhotoKind } from '@/lib/naming'

export const dynamic = 'force-dynamic'

const cell: React.CSSProperties = { padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }
const keyCell: React.CSSProperties = { ...cell, color: 'var(--text-secondary)', width: 130, verticalAlign: 'top' }

export default async function DetailPage({ params }: { params: { id: string } }) {
  const db = createServerClient()
  const { data: r } = await db.from(TABLE).select('*').eq('id', params.id).single()
  if (!r) notFound()

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
    ['備註', r.size_note || '—'],
    ['上傳時間', r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '—'],
  ]

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '20px' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>← 回總覽</Link>
        <h1 style={{ fontSize: 20, margin: '8px 0 16px' }}>{r.hole_short || r.location_note || '上傳明細'}</h1>

        <div style={{ marginBottom: 20 }}>
          <StatusToggle id={r.id} status={r.status} />
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <table style={{ borderCollapse: 'collapse', flex: '1 1 320px' }}>
            <tbody>
              {fields.map(([k, v]) => (
                <tr key={k}><td style={keyCell}>{k}</td><td style={cell}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <div style={{ flex: '1 1 360px' }}>
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
      </main>
    </>
  )
}
