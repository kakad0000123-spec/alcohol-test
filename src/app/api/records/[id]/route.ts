import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLE } from '@/lib/supabase'

// PATCH /api/records/[id] { status: '待寄' | '已寄' } — 改寄送狀態
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const status = body.status
  if (status !== '待寄' && status !== '已寄') {
    return NextResponse.json({ error: '狀態值不合法' }, { status: 400 })
  }
  const db = createServerClient()
  const patch: Record<string, unknown> = { status }
  patch.sent_at = status === '已寄' ? new Date().toISOString() : null

  const { error } = await db.from(TABLE).update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, status })
}
