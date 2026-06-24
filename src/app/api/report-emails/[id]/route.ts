import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// DELETE /api/report-emails/[id] — 移除收件人
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerClient()
  const { error } = await db.from('report_emails').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
