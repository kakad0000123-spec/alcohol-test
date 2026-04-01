import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import * as XLSX from 'xlsx'

// GET /api/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: '請提供 startDate 與 endDate' }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays < 0) {
    return NextResponse.json({ error: '結束日期不能早於開始日期' }, { status: 400 })
  }
  if (diffDays > 90) {
    return NextResponse.json({ error: '最大區間為 90 天' }, { status: 400 })
  }

  const db = createServerClient()
  const { data: records, error } = await db
    .from('records')
    .select('date, session, vendor_id, vendor:vendors(name)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('session', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 彙總：同日同廠商同時段合計張數
  const aggMap: Record<string, { 日期: string; 廠商名稱: string; 時段: string; 張數: number }> = {}
  for (const r of records || []) {
    const vendorName = (r.vendor as unknown as { name: string } | null)?.name || r.vendor_id
    const session = r.session === 'AM' ? '上午' : '下午'
    const key = `${r.date}_${vendorName}_${session}`
    if (!aggMap[key]) {
      aggMap[key] = { 日期: r.date, 廠商名稱: vendorName, 時段: session, 張數: 0 }
    }
    aggMap[key].張數++
  }

  const data = Object.values(aggMap)
  const ws = XLSX.utils.json_to_sheet(data)
  // 設定欄寬
  ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 6 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '酒測紀錄')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="alcohol-test-${startDate}-${endDate}.xlsx"`,
    },
  })
}
