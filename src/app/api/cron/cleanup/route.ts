import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'

// POST /api/cron/cleanup — 兩週緩衝清除（HANDOFF §8 step 9 / §9）
// 找出「已寄出且 sent_at 超過 14 天」的記錄，刪 Storage 私照，並把 3 個 path 欄位設為 NULL（保留資料列）。
// 由 Vercel Cron 觸發，middleware 已用 CRON_SECRET 擋。
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const db = createServerClient()

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: oldRows, error } = await db
    .from(TABLE)
    .select('id, photo_done_path, photo_far_path, photo_near_path, sent_at')
    .not('sent_at', 'is', null)
    .lt('sent_at', cutoff)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!oldRows || oldRows.length === 0) {
    return NextResponse.json({ message: '沒有需要清理的照片', deleted: 0 })
  }

  const paths = oldRows.flatMap(r =>
    [r.photo_done_path, r.photo_far_path, r.photo_near_path].filter(Boolean) as string[]
  )

  if (paths.length > 0) {
    const { error: storageError } = await db.storage.from(BUCKET).remove(paths)
    if (storageError) console.error('Storage cleanup error:', storageError)
  }

  const ids = oldRows.map(r => r.id)
  await db.from(TABLE)
    .update({ photo_done_path: null, photo_far_path: null, photo_near_path: null })
    .in('id', ids)

  return NextResponse.json({ success: true, rows: ids.length, deletedFiles: paths.length })
}
