import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth'

// 公開路徑：登入頁、登入 API、廠商表單（靜態 HTML）
const PUBLIC_PATHS = ['/', '/api/auth', '/upload.html']

// 只有 superadmin 能進的路徑（vendor 一律擋）。
// 注意：/api/records/[id] 不在此列 —— PUT(編輯) 開放 vendor、PATCH(改狀態) 由 handler 擋。
const SUPERADMIN_PATHS = [
  '/dashboard/settings',
  '/dashboard/users',
  '/api/users',
  '/api/report-config',
  '/api/report-emails',
  '/api/records/batch',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Cron route：用 CRON_SECRET 驗證（Vercel Cron 帶 Authorization header）
  if (pathname.startsWith('/api/cron/')) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()

  const user = await getAuthUserFromRequest(req)

  // 未登入 → API 回 401、頁面導回登入
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  // superadmin-only 區段：vendor → API 403、頁面導回總覽
  const adminOnly = SUPERADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (adminOnly && user.role !== 'superadmin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 排除靜態資源與 .html（廠商表單走 /upload.html，自行在上面放行）
    '/((?!_next/static|_next/image|favicon.ico|.*\\.html$|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)',
  ],
}
