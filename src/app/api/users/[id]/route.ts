import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { isAdmin } from '@/lib/access'

// PUT /api/users/[id] { account?, display_name?, role?, contractor?, password?, active? } — 更新帳號（superadmin only）
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getAuthUserFromRequest(req)
  if (!isAdmin(me)) return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const db = createServerClient()
  const { data: existing } = await db.from('app_users').select('role, contractor').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: '找不到帳號' }, { status: 404 })

  const { account, display_name, role, contractor, password, active } = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (account !== undefined) updates.account = String(account).trim()
  if (display_name !== undefined) updates.display_name = String(display_name).trim()

  let nextRole: string | undefined
  if (role !== undefined) {
    if (role !== 'superadmin' && role !== 'vendor') return NextResponse.json({ error: '無效的角色' }, { status: 400 })
    // 不能改掉自己的 superadmin 角色（避免把自己鎖在外面）
    if (me!.id === params.id && role !== 'superadmin') {
      return NextResponse.json({ error: '不能變更自己的角色' }, { status: 400 })
    }
    nextRole = role
    updates.role = role
    if (role === 'superadmin') updates.contractor = null
  }
  if (contractor !== undefined) {
    // 只有 vendor 角色才設 contractor；若本次同時設 superadmin 則忽略
    if (nextRole !== 'superadmin') updates.contractor = contractor ? String(contractor).trim() : null
  }
  if (password) updates.password_hash = await bcrypt.hash(String(password), 10)
  if (active !== undefined) {
    if (me!.id === params.id && active === false) {
      return NextResponse.json({ error: '不能停用自己的帳號' }, { status: 400 })
    }
    updates.active = !!active
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: '沒有要更新的欄位' }, { status: 400 })

  // 最終態防呆：vendor 一定要綁 contractor（PUT 不可把帳號留成 vendor 卻無 contractor）
  const finalRole = updates.role !== undefined ? updates.role : existing.role
  const finalContractor = 'contractor' in updates ? updates.contractor : existing.contractor
  if (finalRole === 'vendor' && !finalContractor) {
    return NextResponse.json({ error: '廠商帳號必須綁定 contractor（基誠/偉翔）' }, { status: 400 })
  }

  const { data, error } = await db
    .from('app_users')
    .update(updates)
    .eq('id', params.id)
    .select('id, account, display_name, role, contractor, active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '帳號已存在' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ user: data })
}

// DELETE /api/users/[id] — 刪除帳號（superadmin only，不能刪自己）
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getAuthUserFromRequest(req)
  if (!isAdmin(me)) return NextResponse.json({ error: '權限不足' }, { status: 403 })
  if (me!.id === params.id) return NextResponse.json({ error: '不能刪除自己的帳號' }, { status: 400 })

  const db = createServerClient()
  const { error } = await db.from('app_users').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
