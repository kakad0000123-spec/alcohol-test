import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/records/photo?path=xxx — 取得照片的簽名 URL
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: '缺少 path 參數' }, { status: 400 })

  // 廠商只能看自己的
  if (user.type === 'vendor' && !path.startsWith(user.id)) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  const db = createServerClient()
  const { data, error } = await db.storage
    .from('alcohol-photos')
    .createSignedUrl(path, 60 * 60) // 1 hour

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}
