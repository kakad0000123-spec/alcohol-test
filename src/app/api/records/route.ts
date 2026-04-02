import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'
import { getTodayDate } from '@/lib/utils'

// GET /api/records?date=YYYY-MM-DD&session=AM|PM&vendor_id=xxx
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date') || getTodayDate()
  const session = searchParams.get('session')
  const vendorId = searchParams.get('vendor_id')

  const db = createServerClient()
  let query = db
    .from('records')
    .select('*, vendor:vendors(id, name, contact, account)')
    .eq('date', date)
    .order('uploaded_at', { ascending: false })

  if (session) query = query.eq('session', session)

  // 廠商只能看自己的
  if (user.type === 'vendor') {
    query = query.eq('vendor_id', user.id)
  } else if (vendorId) {
    query = query.eq('vendor_id', vendorId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data })
}

// 依台灣時間（UTC+8）自動判定場次
function getSessionByTaiwanTime(): 'AM' | 'PM' | 'Night' {
  const twHour = (new Date().getUTCHours() + 8) % 24
  if (twHour >= 7 && twHour < 12) return 'AM'
  if (twHour >= 12 && twHour < 17) return 'PM'
  return 'Night'
}

// POST /api/records — 上傳照片
export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'vendor') {
    return NextResponse.json({ error: '只有廠商可以上傳' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const date = formData.get('date') as string
    const fileHash = formData.get('file_hash') as string

    if (!file || !date || !fileHash) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    // 依上傳時間自動判定場次（台灣時區 UTC+8）
    const session = getSessionByTaiwanTime()

    const db = createServerClient()

    // 檢查重複（同 vendor + date + file_hash）
    const { data: existing } = await db
      .from('records')
      .select('id')
      .eq('vendor_id', user.id)
      .eq('date', date)
      .eq('file_hash', fileHash)
      .single()

    if (existing) {
      return NextResponse.json({ error: '此照片已上傳過', duplicate: true }, { status: 409 })
    }

    // 上傳到 Supabase Storage
    const filePath = `${user.id}/${date}/${session}/${fileHash}.jpg`
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await db.storage
      .from('alcohol-photos')
      .upload(filePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError && uploadError.message !== 'The resource already exists') {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 寫入 records 表
    const { data: record, error: insertError } = await db
      .from('records')
      .insert({
        vendor_id: user.id,
        date,
        session,
        file_hash: fileHash,
        file_path: filePath,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 排程 LINE 通知（fire-and-forget，不影響回應）
    if (session !== 'Night') {
      scheduleLineNotification(user.id, date, session).catch(e =>
        console.error('LINE notification schedule error:', e)
      )
    }

    return NextResponse.json({ record }, { status: 201 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '上傳失敗' }, { status: 500 })
  }
}

async function scheduleLineNotification(vendorId: string, date: string, session: 'AM' | 'PM') {
  const db = createServerClient()

  // 檢查 line_config 是否啟用
  const { data: config } = await db.from('line_config').select('am_enabled, pm_enabled').eq('id', 1).single()
  if (!config) return
  const enabled = session === 'AM' ? config.am_enabled : config.pm_enabled
  if (!enabled) return

  // 插入 pending 記錄（onConflict ignoreDuplicates 確保只有第一張照片觸發）
  await db.from('line_notify_log').upsert(
    { vendor_id: vendorId, date, session, first_upload_at: new Date().toISOString(), sent: false },
    { onConflict: 'vendor_id,date,session', ignoreDuplicates: true }
  )
}
