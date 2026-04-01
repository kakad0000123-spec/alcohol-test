import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { getTodayDate } from '@/lib/utils'

// DELETE /api/records/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 })

  const db = createServerClient()

  // 取得記錄
  const { data: record, error: fetchError } = await db
    .from('records')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !record) {
    return NextResponse.json({ error: '找不到記錄' }, { status: 404 })
  }

  // 廠商只能刪自己當天的照片
  if (user.type === 'vendor') {
    if (record.vendor_id !== user.id) {
      return NextResponse.json({ error: '無權限刪除此記錄' }, { status: 403 })
    }
    if (record.date !== getTodayDate()) {
      return NextResponse.json({ error: '只能刪除當天的照片' }, { status: 403 })
    }
  }

  // 刪除 Storage 檔案
  if (record.file_path) {
    await db.storage.from('alcohol-photos').remove([record.file_path])
  }

  // 刪除記錄
  const { error } = await db.from('records').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
