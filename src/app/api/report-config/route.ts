import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/report-config — 寄送設定（單列 id=1）
export async function GET() {
  const db = createServerClient()
  const { data, error } = await db
    .from('report_config')
    .select('id, enabled, send_dow, mail_from')
    .eq('id', 1)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

// PATCH /api/report-config { enabled?, send_dow?, mail_from? }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
  if (body.mail_from !== undefined) patch.mail_from = (body.mail_from || '').trim() || null
  if (body.send_dow !== undefined) {
    const d = Number(body.send_dow)
    patch.send_dow = Number.isInteger(d) && d >= 0 && d <= 6 ? d : null
  }
  const db = createServerClient()
  const { data, error } = await db
    .from('report_config')
    .update(patch)
    .eq('id', 1)
    .select('id, enabled, send_dow, mail_from')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
