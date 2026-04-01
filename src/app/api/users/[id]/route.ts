import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { account, password, display_name, role } = await req.json()
  const updates: Record<string, string> = {}
  if (account) updates.account = account
  if (display_name) updates.display_name = display_name
  if (role && ['superadmin', 'user'].includes(role)) updates.role = role
  if (password) updates.password_hash = await bcrypt.hash(password, 10)

  const db = createServerClient()
  const { data, error } = await db
    .from('accounts')
    .update(updates)
    .eq('id', params.id)
    .select('id, account, display_name, role, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '帳號已存在' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ user: data })
}

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getAuthUserFromRequest(req)
  if (!currentUser || currentUser.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  // 不能刪自己
  if (currentUser.id === params.id) {
    return NextResponse.json({ error: '不能刪除自己的帳號' }, { status: 400 })
  }

  const db = createServerClient()
  const { error } = await db.from('accounts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
