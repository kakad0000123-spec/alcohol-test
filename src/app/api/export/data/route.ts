import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createServerClient, TABLE } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Row = {
  work_date: string | null
  contractor: string | null
  knows_hole: boolean
  hole_short: string | null
  serial: string | null
  area: string | null
  grid_x: string | null
  grid_y: string | null
  location_note: string | null
  shape: string | null
  size_label: string | null
  perimeter_mm: number | null
  photo_done_name: string | null
  photo_far_name: string | null
  photo_near_name: string | null
  status: string | null
  size_note: string | null
  created_at: string | null
}

// GET /api/export/data?start=&end=&status=&contractor=&area=  → 下載 Excel 清單
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const start = sp.get('start')
  const end = sp.get('end')

  const db = createServerClient()
  let q = db.from(TABLE).select('*').order('work_date', { ascending: true }).order('created_at', { ascending: true })
  if (start) q = q.gte('work_date', start)
  if (end) q = q.lte('work_date', end)
  const status = sp.get('status'); if (status) q = q.eq('status', status)
  const contractor = sp.get('contractor'); if (contractor) q = q.eq('contractor', contractor)
  const area = sp.get('area'); if (area) q = q.eq('area', area)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []) as Row[]

  const records = rows.map(r => ({
    '施工日期': r.work_date || '',
    '廠商': r.contractor || '',
    '知道孔號': r.knows_hole ? '是' : '否',
    '完整孔號': r.hole_short || '',
    '末三碼': r.serial || '',
    '區域': r.area || '',
    'X': r.grid_x || '',
    'Y': r.grid_y || '',
    '位置說明': r.location_note || '',
    '形狀': r.shape || '',
    '尺寸': r.size_label || '',
    '周長(mm)': r.perimeter_mm ?? '',
    '周長(m)': r.perimeter_mm != null ? Math.round(r.perimeter_mm / 10) / 100 : '',
    '完工檔名': r.photo_done_name || '',
    '遠檔名': r.photo_far_name || '',
    '近檔名': r.photo_near_name || '',
    '狀態': r.status || '',
    '備註': r.size_note || '',
    '上傳時間': r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '',
  }))

  const ws = XLSX.utils.json_to_sheet(records)
  ws['!cols'] = Object.keys(records[0] || { a: 1 }).map(() => ({ wch: 14 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '上傳紀錄')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  const fname = `802BP_data_${start || 'all'}_${end || 'all'}.xlsx`
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  })
}
