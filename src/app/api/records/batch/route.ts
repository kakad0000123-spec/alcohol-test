import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLE, BUCKET } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { isAdmin, ownsContractorRow } from '@/lib/access'
import { isBilled, STATUS_BILLED, STATUS_UNBILLED } from '@/lib/status'

// POST /api/records/batch { ids: string[], op: '已請款' | '未請款' | 'delete' }
// - 改狀態：superadmin only（請款判定由 Po 按，廠商不可改）
// - 刪除：superadmin 全可；vendor 限「自己廠商 + 尚未請款」的紀錄
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
        // 已請款＝已經算進請款單的憑證，不該由廠商單方面刪掉（照片一併沒了、不可復原）
        if (isBilled(t.status)) {
          return NextResponse.json({ error: '已請款的紀錄不能自行刪除，請聯絡管理員' }, { status: 403 })
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

  if (op === STATUS_BILLED || op === STATUS_UNBILLED) {
    if (!isAdmin(user)) return NextResponse.json({ error: '權限不足' }, { status: 403 })
    // sent_at 存的是「標記已請款的時間」（欄位名是寄件時代留下的，見 CORE_RULES）。
    // cron/cleanup 以它為準，在 14 天後刪掉 Storage 照片。
    const patch = { status: op, sent_at: op === STATUS_BILLED ? new Date().toISOString() : null }
    const { error } = await db.from(TABLE).update(patch).in('id', targetIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, updated: targetIds.length })
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}
