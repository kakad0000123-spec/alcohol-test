import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { createServerClient } from './supabase'

// 多帳號 + 角色權限。
// 認證：jose JWT（HS256）放 httpOnly cookie，token 只攜帶身分（id）。
// 授權：role / contractor / active「不信 token 快照」，每次驗簽後用 id 即時回查 app_users，
//       使「停用 / 降權 / 改綁 contractor」在後台變更後立即生效（避免舊 token 7 天內越權）。
//       本系統低流量，每請求多一次 DB 查詢可接受，換來正確的租戶隔離與即時撤銷。

export type Role = 'superadmin' | 'vendor'

export type AuthUser = {
  id: string
  account: string
  display_name: string
  role: Role
  contractor: string | null   // vendor 綁定廠商；superadmin 為 null
}

export const AUTH_COOKIE = 'bp_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 天

// 在呼叫時讀 env（避免 import 期就因缺 env 而丟錯，讓無 env 也能 build）。
// production 一定要設 JWT_SECRET，否則拒絕簽/驗（不留不安全 fallback）。
function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET 未設定或過短（production 需 ≥32 字元）')
    }
    return new TextEncoder().encode('dev-only-insecure-secret-change-me-32++')
  }
  return new TextEncoder().encode(s)
}

// 只簽身分（id）。授權屬性一律回查 DB，不放進 token。
export async function signToken(user: Pick<AuthUser, 'id'>): Promise<string> {
  return new SignJWT({ id: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

// 驗簽 → 取出 id
async function verifySignature(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return typeof payload.id === 'string' ? payload.id : null
  } catch {
    return null
  }
}

// 解析目前使用者：驗簽後用 id 即時回查 app_users。停用 / 帳號不存在 → 視為未登入。
async function resolveUser(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const id = await verifySignature(token)
  if (!id) return null
  const db = createServerClient()
  const { data: u } = await db
    .from('app_users')
    .select('id, account, display_name, role, contractor, active')
    .eq('id', id)
    .single()
  if (!u || !u.active) return null
  return {
    id: u.id,
    account: u.account,
    display_name: u.display_name,
    role: u.role === 'superadmin' ? 'superadmin' : 'vendor',
    contractor: u.contractor ?? null,
  }
}

// server component / route handler 用
export async function getAuthUser(): Promise<AuthUser | null> {
  return resolveUser(cookies().get(AUTH_COOKIE)?.value)
}

// middleware 用
export async function getAuthUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  return resolveUser(req.cookies.get(AUTH_COOKIE)?.value)
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  }
}
