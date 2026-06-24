import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

// 簡易單一密碼閘：登入成功後種一個 httpOnly cookie，值＝DASHBOARD_TOKEN。
// 後台在公網 Vercel 上，這層只是擋住路人；非多帳號/權限系統。
// 日後要做多帳號再換成酒測那套 bcrypt + jose。

export const AUTH_COOKIE = 'bp_auth'

export function checkPassword(input: string): boolean {
  const pw = process.env.DASHBOARD_PASSWORD
  return !!pw && input === pw
}

export function authToken(): string {
  return process.env.DASHBOARD_TOKEN || ''
}

// 給 middleware 用（讀 NextRequest 的 cookie）
export function isAuthedFromRequest(req: NextRequest): boolean {
  const token = authToken()
  return !!token && req.cookies.get(AUTH_COOKIE)?.value === token
}

// 給 server component 用（讀 next/headers cookies）
export function isAuthed(): boolean {
  const token = authToken()
  return !!token && cookies().get(AUTH_COOKIE)?.value === token
}
