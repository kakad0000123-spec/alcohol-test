import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { signToken, clearAuthCookie, createAuthCookie, getAuthUserFromRequest } from '@/lib/auth'
import type { AuthUser } from '@/types'

// GET /api/auth — 取得當前使用者
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }
  return NextResponse.json({ user })
}

// POST /api/auth — 登入
export async function POST(req: NextRequest) {
  try {
    const { account, password } = await req.json()
    if (!account || !password) {
      return NextResponse.json({ error: '請輸入帳號和密碼' }, { status: 400 })
    }
    const db = createServerClient()
    // 先查 accounts 表（後台帳號）
    const { data: accountData } = await db
      .from('accounts')
      .select('*')
      .eq('account', account)
      .single()
    if (accountData) {
      const valid = await bcrypt.compare(password, accountData.password_hash)
      if (!valid) {
        return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
      }
      const user: AuthUser = {
        id: accountData.id,
        account: accountData.account,
        display_name: accountData.display_name,
        role: accountData.role,
        type: 'account',
      }
      const token = await signToken(user)
      const res = NextResponse.json({ user, redirect: '/dashboard' })
      res.cookies.set(createAuthCookie(token))
      return res
    }
    // 再查 vendors 表（廠商）
    const { data: vendorData } = await db
      .from('vendors')
      .select('*')
      .eq('account', account)
      .single()
    if (vendorData) {
      const valid = await bcrypt.compare(password, vendorData.password_hash)
      if (!valid) {
        return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
      }
      const user: AuthUser = {
        id: vendorData.id,
        account: vendorData.account,
        display_name: vendorData.name,
        role: 'vendor',
        type: 'vendor',
      }
      const token = await signToken(user)
      const res = NextResponse.json({ user, redirect: '/upload' })
      res.cookies.set(createAuthCookie(token))
      return res
    }
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// DELETE /api/auth — 登出
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(clearAuthCookie())
  return res
}
