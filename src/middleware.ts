import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth'

// 需要認證的路徑
const PROTECTED_ADMIN_PATHS = ['/dashboard']
const PROTECTED_VENDOR_PATHS = ['/upload']
const PUBLIC_PATHS = ['/', '/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // API cron routes 用 cron secret 驗證
  if (pathname.startsWith('/api/cron/')) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 公開路徑直接放行
  if (PUBLIC_PATHS.includes(pathname) || pathname === '/api/auth' || pathname === '/api/auth' || pathname.startsWith('/api/auth/') || pathname === '/api/line/webhook' || pathname === '/api/setup') {
    return NextResponse.next()
  }

  const user = await getAuthUserFromRequest(req)

  // 未登入 → 導到首頁
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 廠商不能進後台
  if (PROTECTED_ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    if (user.type === 'vendor' || user.role === 'vendor') {
      return NextResponse.redirect(new URL('/upload', req.url))
    }
  }

  // 後台帳號不能進廠商上傳頁
  if (PROTECTED_VENDOR_PATHS.some(p => pathname.startsWith(p))) {
    if (user.type === 'account') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // superadmin-only API routes
  if (pathname.startsWith('/api/admin/')) {
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
}
