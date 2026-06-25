import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { AUTH_COOKIE, authCookieOptions, signToken, getAuthUserFromRequest, type AuthUser } from '@/lib/auth'

// GET /api/auth — 取得目前登入者
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  return NextResponse.json({ user })
}

// POST /api/auth { account, password } — 登入：查 app_users + bcrypt
export async function POST(req: NextRequest) {
  const { account, password } = await req.json().catch(() => ({}))
  if (!account || !password) {
    return NextResponse.json({ error: '請輸入帳號和密碼' }, { status: 400 })
  }

  const db = createServerClient()
  const { data: u } = await db
    .from('app_users')
    .select('id, account, password_hash, display_name, role, contractor, active')
    .eq('account', account)
    .single()

  // 帳號不存在 / 已停用 / 密碼錯誤 → 一律回相同錯誤（不洩漏帳號是否存在）
  if (!u || !u.active || !(await bcrypt.compare(password, u.password_hash))) {
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  }

  const user: AuthUser = {
    id: u.id,
    account: u.account,
    display_name: u.display_name,
    role: u.role === 'superadmin' ? 'superadmin' : 'vendor',
    contractor: u.contractor ?? null,
  }
  const token = await signToken(user)

  const res = NextResponse.json({ user })
  res.cookies.set(AUTH_COOKIE, token, authCookieOptions())
  return res
}

// DELETE /api/auth — 登出
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
