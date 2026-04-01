import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { getTodayDate } from '@/lib/utils'

// GET /api/dashboard?date=YYYY-MM-DD&session=AM|PM
// 回傳看板資料：所有廠商 + 今日回報狀況
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date') || getTodayDate()
  const rawSession = searchParams.get('session') || 'AM'
  const session = rawSession === 'Night' ? 'Night' : rawSession.toUpperCase()

  const db = createServerClient()

  // 取得所有廠商
  const { data: vendors, error: vendorError } = await db
    .from('vendors')
    .select('id, name, contact, account')
    .order('name')

  if (vendorError) return NextResponse.json({ error: vendorError.message }, { status: 500 })

  // 取得今日所有紀錄
  const { data: records, error: recordError } = await db
    .from('records')
    .select('*')
    .eq('date', date)
    .eq('session', session)

  if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 })

  // 組合資料
  const vendorMap = new Map<string, typeof records>()
  for (const record of records || []) {
    if (!vendorMap.has(record.vendor_id)) vendorMap.set(record.vendor_id, [])
    vendorMap.get(record.vendor_id)!.push(record)
  }

  const vendorData = (vendors || []).map(v => ({
    vendor: v,
    records: vendorMap.get(v.id) || [],
    count: (vendorMap.get(v.id) || []).length,
    hasReported: vendorMap.has(v.id),
  }))

  const reportedCount = vendorData.filter(v => v.hasReported).length
  const totalCount = vendorData.length
  const totalPhotos = records?.length || 0

  return NextResponse.json({
    date,
    session,
    vendors: vendorData,
    reportedCount,
    totalCount,
    totalPhotos,
  })
}
