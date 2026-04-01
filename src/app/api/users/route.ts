import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/users
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const db = createServerClient()
  const { data, error } = await db
    .from('accounts')
    .select('id, account, display_name, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

// POST /api/users
export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { account, password, display_name, role } = await req.json()
  if (!account || !password || !display_name || !role) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }
  if (!['superadmin', 'user'].includes(role)) {
    return NextResponse.json({ error: '無效的角色' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const db = createServerClient()

  const { data, error } = await db
    .from('accounts')
    .insert({ account, password_hash, display_name, role })
    .select('id, account, display_name, role, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '帳號已存在' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: data }, { status: 201 })
}
