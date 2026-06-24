import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, checkPassword, authToken } from '@/lib/auth'

// POST /api/auth { password } → 設登入 cookie
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))

  if (!checkPassword(password)) {
    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 })
  }
  const token = authToken()
  if (!token) {
    return NextResponse.json({ error: '伺服器未設定 DASHBOARD_TOKEN' }, { status: 500 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 小時
  })
  return res
}

// DELETE /api/auth → 登出
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
