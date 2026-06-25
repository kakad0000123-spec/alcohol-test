import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { isAdmin } from '@/lib/access'

// GET /api/users — 帳號清單（superadmin only）
export async function GET(req: NextRequest) {
  if (!isAdmin(await getAuthUserFromRequest(req))) return NextResponse.json({ error: '權限不足' }, { status: 403 })
  const db = createServerClient()
  const { data, error } = await db
    .from('app_users')
    .select('id, account, display_name, role, contractor, active, created_at')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data || [] })
}

// POST /api/users { account, password, display_name, role, contractor } — 建立帳號（superadmin only）
export async function POST(req: NextRequest) {
  if (!isAdmin(await getAuthUserFromRequest(req))) return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { account, password, display_name, role, contractor } = await req.json().catch(() => ({}))
  if (!account || !password || !display_name || !role) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }
  if (role !== 'superadmin' && role !== 'vendor') {
    return NextResponse.json({ error: '無效的角色' }, { status: 400 })
  }
  if (role === 'vendor' && !contractor) {
    return NextResponse.json({ error: '廠商帳號必須指定 contractor（基誠/偉翔）' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(String(password), 10)
  const db = createServerClient()
  const { data, error } = await db
    .from('app_users')
    .insert({
      account: String(account).trim(),
      password_hash,
      display_name: String(display_name).trim(),
      role,
      contractor: role === 'vendor' ? String(contractor).trim() : null,
    })
    .select('id, account, display_name, role, contractor, active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '帳號已存在' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ user: data }, { status: 201 })
}
