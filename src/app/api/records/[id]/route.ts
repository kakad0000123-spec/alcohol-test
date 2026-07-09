import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, TABLE } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { isAdmin, ownsContractorRow } from '@/lib/access'
import { computePerim, fullHoleCode, serial3, parseFlatbar } from '@/lib/holes'

// PATCH /api/records/[id] { status } — 改寄送狀態（superadmin only；廠商不可改狀態）
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUserFromRequest(req)
  if (!isAdmin(user)) return NextResponse.json({ error: '權限不足' }, { status: 403 })

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

// PUT /api/records/[id] — 編輯「尺寸 + 位置」欄位（superadmin 全部；vendor 限自己廠商那筆）
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const db = createServerClient()
  const { data: row, error: readErr } = await db
    .from(TABLE)
    .select('contractor, knows_hole, area, grid_x, grid_y, serial, shape, dia_mm, width_mm, height_mm, flatbar_raw')
    .eq('id', params.id)
    .single()
  if (readErr || !row) return NextResponse.json({ error: '找不到資料' }, { status: 404 })

  // vendor 只能編自己廠商的那筆（fail-closed）
  if (!ownsContractorRow(user, row.contractor)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))

  // 取白名單欄位（未帶的沿用原值），不信任 client 的 knows_hole/contractor
  const area = body.area !== undefined ? str(body.area) : row.area
  const grid_x = body.grid_x !== undefined ? str(body.grid_x) : row.grid_x
  const grid_y = body.grid_y !== undefined ? str(body.grid_y) : row.grid_y
  const shapeRaw = body.shape !== undefined ? str(body.shape) : row.shape
  const shape = shapeRaw === '圓' || shapeRaw === '矩' ? shapeRaw : null
  const dia_mm = shape === '圓' ? (body.dia_mm !== undefined ? num(body.dia_mm) : row.dia_mm) : null
  const width_mm = shape === '矩' ? (body.width_mm !== undefined ? num(body.width_mm) : row.width_mm) : null
  const height_mm = shape === '矩' ? (body.height_mm !== undefined ? num(body.height_mm) : row.height_mm) : null

  const patch: Record<string, unknown> = {
    work_date: str(body.work_date),
    area, grid_x, grid_y,
    shape, dia_mm, width_mm, height_mm,
    size_note: str(body.size_note),
  }

  // 衍生欄位以同一套規則重算（避免改了尺寸/格線、衍生欄位沒跟著動）
  const perim = computePerim(shape, dia_mm, width_mm, height_mm)
  patch.perimeter_mm = perim?.perimeter_mm ?? null
  patch.size_label = perim?.size_label ?? null

  // 扁鐵：未帶沿用原值；flatbar_mm 一律由伺服器重算（不信任 client 傳的長度）
  const fb = parseFlatbar(body.flatbar_raw !== undefined ? str(body.flatbar_raw) : row.flatbar_raw)
  if (fb.state === 'invalid') {
    return NextResponse.json({ error: '扁鐵格式只能用數字、＋、＊' }, { status: 400 })
  }
  patch.flatbar_raw = fb.state === 'ok' ? fb.normalized : null
  patch.flatbar_mm = fb.state === 'ok' ? fb.mm : null

  if (row.knows_hole) {
    const serial = serial3(body.serial !== undefined ? str(body.serial) : row.serial)
    patch.serial = serial
    patch.hole_short = fullHoleCode(area, grid_x, grid_y, serial)
  } else {
    patch.location_note = str(body.location_note)
  }

  const { error } = await db.from(TABLE).update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
