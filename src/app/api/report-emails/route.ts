import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/report-emails — 收件人清單
export async function GET() {
  const db = createServerClient()
  const { data, error } = await db
    .from('report_emails')
    .select('id, email, label, kind, created_at')
    .order('kind', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ emails: data || [] })
}

// POST /api/report-emails { email, label, kind } — 新增收件人
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = (body.email || '').trim()
  const label = (body.label || '').trim() || null
  const kind = body.kind === 'contractor' ? 'contractor' : 'company'
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email 格式不正確' }, { status: 400 })
  }
  const db = createServerClient()
  const { data, error } = await db
    .from('report_emails')
    .insert({ email, label, kind })
    .select('id, email, label, kind')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ email: data })
}
