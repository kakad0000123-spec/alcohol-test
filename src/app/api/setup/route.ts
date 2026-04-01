import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'

// POST /api/setup — 一次性初始化（請在部署後立即執行，之後刪除此路由）
// 使用方式：curl -X POST https://your-domain.com/api/setup -H "X-Setup-Key: SETUP_KEY"
export async function POST(req: NextRequest) {
  const setupKey = req.headers.get('x-setup-key')
  if (setupKey !== 'alcohol-setup-2024') {
    return NextResponse.json({ error: '無效的設定金鑰' }, { status: 401 })
  }

  const db = createServerClient()
  const results: string[] = []

  try {
    // 建立 report_config 預設資料
    const { error: configError } = await db
      .from('report_config')
      .upsert({ id: 1, enabled: true, am_time: '09:00', pm_time: '15:00' })
    results.push(configError ? `report_config: ❌ ${configError.message}` : 'report_config: ✅')

    // 建立 admin 帳號
    const passwordHash = await bcrypt.hash('admin', 10)
    const { error: adminError } = await db
      .from('accounts')
      .upsert({
        account: 'admin',
        password_hash: passwordHash,
        display_name: '系統管理員',
        role: 'superadmin',
      }, { onConflict: 'account' })
    results.push(adminError ? `admin account: ❌ ${adminError.message}` : 'admin account: ✅')

    // 建立 Storage bucket
    const { error: bucketError } = await db.storage.createBucket('alcohol-photos', {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })
    results.push(
      bucketError && !bucketError.message.toLowerCase().includes('already exists')
        ? `bucket: ❌ ${bucketError.message}`
        : 'bucket: ✅'
    )

    return NextResponse.json({
      success: true,
      results,
      note: '資料初始化完成。預設帳號 admin / admin，請登入後立即修改密碼。',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err), results }, { status: 500 })
  }
}
