import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/report-emails
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const db = createServerClient()
  const { data, error } = await db.from('report_emails').select('*').order('email')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ emails: data })
}

// POST /api/report-emails — superadmin only
export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: '缺少 email' }, { status: 400 })

  const db = createServerClient()
  const { data, error } = await db
    .from('report_emails')
    .insert({ email })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email 已存在' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ email: data }, { status: 201 })
}
