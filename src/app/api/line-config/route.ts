import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/line-config
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const db = createServerClient()
  const { data, error } = await db.from('line_config').select('*').eq('id', 1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

// PUT /api/line-config — superadmin only
export async function PUT(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const body = await req.json()
  const {
    am_enabled, am_start, am_end, am_token, am_group_id,
    pm_enabled, pm_start, pm_end, pm_token, pm_group_id,
  } = body

  const db = createServerClient()
  const { data, error } = await db
    .from('line_config')
    .upsert({
      id: 1,
      am_enabled, am_start, am_end, am_token, am_group_id,
      pm_enabled, pm_start, pm_end, pm_token, pm_group_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
