import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/history — 歷史紀錄，按日期分組，含廠商明細
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const db = createServerClient()
  const { data: records, error } = await db
    .from('records')
    .select('date, session, vendor_id, vendor:vendors(name)')
    .order('date', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 按日期分組，追蹤每家廠商 AM/PM/Night 張數
  const grouped: Record<string, {
    date: string
    amVendors: Map<string, number>
    pmVendors: Map<string, number>
    nightVendors: Map<string, number>
  }> = {}

  for (const r of records || []) {
    if (!grouped[r.date]) {
      grouped[r.date] = { date: r.date, amVendors: new Map(), pmVendors: new Map(), nightVendors: new Map() }
    }
    const vendorName = (r.vendor as unknown as { name: string } | null)?.name || r.vendor_id
    if (r.session === 'AM') {
      grouped[r.date].amVendors.set(vendorName, (grouped[r.date].amVendors.get(vendorName) || 0) + 1)
    } else if (r.session === 'PM') {
      grouped[r.date].pmVendors.set(vendorName, (grouped[r.date].pmVendors.get(vendorName) || 0) + 1)
    } else {
      grouped[r.date].nightVendors.set(vendorName, (grouped[r.date].nightVendors.get(vendorName) || 0) + 1)
    }
  }

  const history = Object.values(grouped).map(g => ({
    date: g.date,
    amVendorCount: g.amVendors.size,
    amPhotoCount: Array.from(g.amVendors.values()).reduce((a, b) => a + b, 0),
    pmVendorCount: g.pmVendors.size,
    pmPhotoCount: Array.from(g.pmVendors.values()).reduce((a, b) => a + b, 0),
    nightVendorCount: g.nightVendors.size,
    nightPhotoCount: Array.from(g.nightVendors.values()).reduce((a, b) => a + b, 0),
    amVendors: Array.from(g.amVendors.entries()).map(([name, count]) => ({ name, count })),
    pmVendors: Array.from(g.pmVendors.entries()).map(([name, count]) => ({ name, count })),
    nightVendors: Array.from(g.nightVendors.entries()).map(([name, count]) => ({ name, count })),
  }))

  return NextResponse.json({ history })
}
