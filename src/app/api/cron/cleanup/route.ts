import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST /api/cron/cleanup — 刪除 5 天前的照片
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const db = createServerClient()

  // 找出 5 天前且還有 file_path 的記錄
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 5)
  const cutoff = cutoffDate.toISOString().split('T')[0]

  const { data: oldRecords } = await db
    .from('records')
    .select('id, file_path')
    .lt('date', cutoff)
    .neq('file_path', '')

  if (!oldRecords || oldRecords.length === 0) {
    return NextResponse.json({ message: '沒有需要清理的照片', deleted: 0 })
  }

  const paths = oldRecords.map(r => r.file_path).filter(Boolean)

  // 刪除 Storage 中的照片
  if (paths.length > 0) {
    const { error: storageError } = await db.storage.from('alcohol-photos').remove(paths)
    if (storageError) {
      console.error('Storage cleanup error:', storageError)
    }
  }

  // 清空 file_path 欄位（保留記錄）
  const ids = oldRecords.map(r => r.id)
  await db.from('records').update({ file_path: '' }).in('id', ids)

  return NextResponse.json({ success: true, deleted: paths.length })
}
