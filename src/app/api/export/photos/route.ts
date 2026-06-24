import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { photoFileName, type PhotoKind } from '@/lib/naming'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Row = {
  area: string | null
  hole_short: string | null
  serial: string | null
  photo_done_name: string | null
  photo_far_name: string | null
  photo_near_name: string | null
  photo_done_path: string | null
  photo_far_path: string | null
  photo_near_path: string | null
}

// GET /api/export/photos?start=&end=&status=&contractor=&area=
// 把範圍內照片打包成 zip，依區域分資料夾，檔名照工作檔名規則。
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const start = sp.get('start')
  const end = sp.get('end')

  const db = createServerClient()
  let q = db.from(TABLE).select('*').order('work_date', { ascending: true })
  if (start) q = q.gte('work_date', start)
  if (end) q = q.lte('work_date', end)
  const status = sp.get('status'); if (status) q = q.eq('status', status)
  const contractor = sp.get('contractor'); if (contractor) q = q.eq('contractor', contractor)
  const area = sp.get('area'); if (area) q = q.eq('area', area)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []) as Row[]

  const zip = new JSZip()
  let added = 0
  for (const r of rows) {
    const photos: { k: PhotoKind; path: string | null }[] = [
      { k: 'done', path: r.photo_done_path },
      { k: 'far', path: r.photo_far_path },
      { k: 'near', path: r.photo_near_path },
    ]
    for (const p of photos) {
      if (!p.path) continue
      const { data: blob, error: dlErr } = await db.storage.from(BUCKET).download(p.path)
      if (dlErr || !blob) continue
      const buf = Buffer.from(await blob.arrayBuffer())
      const folder = (r.area || '未分區').replace(/[\\/]/g, '_')
      zip.file(`${folder}/${photoFileName(r, p.k)}`, buf)
      added++
    }
  }

  if (added === 0) return NextResponse.json({ error: '範圍內沒有照片' }, { status: 404 })

  const content = await zip.generateAsync({ type: 'nodebuffer' })
  const fname = `802BP_photos_${start || 'all'}_${end || 'all'}.zip`
  return new NextResponse(new Uint8Array(content), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  })
}
