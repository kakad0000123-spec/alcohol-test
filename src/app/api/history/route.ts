import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/history — 歷史紀錄，按日期分組
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

  // 按日期分組
  const grouped: Record<string, { date: string; am: number; pm: number; vendors: Set<string> }> = {}
  for (const r of records || []) {
    if (!grouped[r.date]) {
      grouped[r.date] = { date: r.date, am: 0, pm: 0, vendors: new Set() }
    }
    if (r.session === 'AM') grouped[r.date].am++
    else grouped[r.date].pm++
    grouped[r.date].vendors.add(r.vendor_id)
  }

  const history = Object.values(grouped).map(g => ({
    date: g.date,
    am: g.am,
    pm: g.pm,
    vendorCount: g.vendors.size,
  }))

  return NextResponse.json({ history })
}
