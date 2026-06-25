import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { isAdmin } from '@/lib/access'

// POST /api/records/batch { ids: string[], op: '已寄' | '待寄' | 'delete' } — superadmin only
export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!isAdmin(user)) return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { ids, op } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: '未選取資料' }, { status: 400 })
  }
  const db = createServerClient()

  if (op === 'delete') {
    // 先撈照片路徑 → 刪 Storage → 刪資料列
    const { data } = await db.from(TABLE).select('photo_done_path, photo_far_path, photo_near_path').in('id', ids)
    const paths = (data || []).flatMap(r =>
      [r.photo_done_path, r.photo_far_path, r.photo_near_path].filter(Boolean) as string[]
    )
    if (paths.length) await db.storage.from(BUCKET).remove(paths)
    const { error } = await db.from(TABLE).delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: ids.length })
  }

  if (op === '已寄' || op === '待寄') {
    const patch = { status: op, sent_at: op === '已寄' ? new Date().toISOString() : null }
    const { error } = await db.from(TABLE).update(patch).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, updated: ids.length })
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}
