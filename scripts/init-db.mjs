/**
 * 資料庫初始化腳本
 * 使用方式: node scripts/init-db.mjs
 */
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('請先設定環境變數：NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('🚀 開始初始化資料庫...')

  // 建立 report_config 預設資料
  const { error: configError } = await db
    .from('report_config')
    .upsert({ id: 1, enabled: true, am_time: '09:00', pm_time: '15:00' })
  if (configError) console.error('report_config error:', configError.message)
  else console.log('✅ report_config 初始化完成')

  // 建立 superadmin 帳號
  const passwordHash = await bcrypt.hash('admin', 10)
  const { error: accountError } = await db
    .from('accounts')
    .upsert({
      account: 'admin',
      password_hash: passwordHash,
      display_name: '系統管理員',
      role: 'superadmin'
    }, { onConflict: 'account' })
  if (accountError) console.error('accounts error:', accountError.message)
  else console.log('✅ 預設管理員帳號建立完成 (admin/admin)')

  // 建立 Storage bucket
  const { error: bucketError } = await db.storage.createBucket('alcohol-photos', {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('bucket error:', bucketError.message)
  } else {
    console.log('✅ Storage bucket 建立完成')
  }

  console.log('\n🎉 初始化完成！')
  console.log('📋 請在 Supabase Dashboard > SQL Editor 執行 sql/init.sql 建立資料表')
  console.log('🔑 預設登入：admin / admin')
}

main().catch(console.error)
