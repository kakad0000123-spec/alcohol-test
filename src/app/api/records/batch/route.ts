import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { isAdmin, ownsContractorRow } from '@/lib/access'

// POST /api/records/batch { ids: string[], op: '已寄' | '待寄' | 'delete' }
// - 改狀態：superadmin only（廠商不可改寄送狀態）
// - 刪除：superadmin 全可；vendor 限「自己廠商 + 尚未寄出」的紀錄
export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const { ids, op } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: '未選取資料' }, { status: 400 })
  }
  // 去重 + 濾掉非字串：.in() 對重複 id 只回一列，不去重的話下面的筆數比對會誤判成「找不到資料」
  const targetIds = Array.from(new Set(ids.filter((x: unknown): x is string => typeof x === 'string')))
  if (targetIds.length === 0) return NextResponse.json({ error: '未選取資料' }, { status: 400 })

  const db = createServerClient()

  if (op === 'delete') {
    // 一次撈齊「驗權限要的欄位」與「照片路徑」，再逐筆檢查
    const { data: targets } = await db
      .from(TABLE)
      .select('id, contractor, status, photo_done_path, photo_far_path, photo_near_path')
      .in('id', targetIds)
    if (!targets || targets.length !== targetIds.length) {
      return NextResponse.json({ error: '找不到資料' }, { status: 404 })
    }

    // vendor 的兩道限制（fail-closed：任一筆不合格就整批拒絕，不做部分成功）
    if (!isAdmin(user)) {
      for (const t of targets) {
        if (!ownsContractorRow(user, t.contractor)) {
          return NextResponse.json({ error: '權限不足' }, { status: 403 })
        }
        // 已寄＝公司端已收到的請款憑證，不該由廠商單方面刪掉（照片一併沒了、不可復原）
        if (t.status === '已寄') {
          return NextResponse.json({ error: '已寄出的紀錄不能自行刪除，請聯絡管理員' }, { status: 403 })
        }
      }
    }

    const paths = targets.flatMap(r =>
      [r.photo_done_path, r.photo_far_path, r.photo_near_path].filter(Boolean) as string[]
    )
    if (paths.length) await db.storage.from(BUCKET).remove(paths)
    const { error } = await db.from(TABLE).delete().in('id', targetIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: targetIds.length })
  }

  if (op === '已寄' || op === '待寄') {
    if (!isAdmin(user)) return NextResponse.json({ error: '權限不足' }, { status: 403 })
    const patch = { status: op, sent_at: op === '已寄' ? new Date().toISOString() : null }
    const { error } = await db.from(TABLE).update(patch).in('id', targetIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, updated: targetIds.length })
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}
