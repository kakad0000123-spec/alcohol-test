import { NextRequest, NextResponse } from 'next/server'
import { isAuthedFromRequest } from '@/lib/auth'

// 公開路徑：登入頁、登入 API、廠商表單（靜態 HTML）
const PUBLIC_PATHS = ['/', '/api/auth', '/upload.html']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Cron route：用 CRON_SECRET 驗證（Vercel Cron 會帶 Authorization header）
  if (pathname.startsWith('/api/cron/')) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()

  // 其餘（/dashboard 等）需登入
  if (!isAuthedFromRequest(req)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 排除靜態資源與 .html（廠商表單走 /upload.html，自行在上面放行）
    '/((?!_next/static|_next/image|favicon.ico|.*\\.html$|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)',
  ],
}
