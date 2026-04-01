import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// DELETE /api/report-emails/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const db = createServerClient()
  const { error } = await db.from('report_emails').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
