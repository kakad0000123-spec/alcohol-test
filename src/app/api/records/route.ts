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

    // 觸發 LINE 通知（fire-and-forget，不影響回應）
    if (session !== 'Night') {
      sendLineNotification(db, user.id, date, session).catch(e =>
        console.error('LINE notification error:', e)
      )
    }

    return NextResponse.json({ record }, { status: 201 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '上傳失敗' }, { status: 500 })
  }
}

async function sendLineNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  vendorId: string,
  date: string,
  session: 'AM' | 'PM'
) {
  // 讀取 line_config
  const { data: config, error: configErr } = await db
    .from('line_config')
    .select('*')
    .eq('id', 1)
    .single()

  if (configErr || !config) return

  const enabled = session === 'AM' ? config.am_enabled : config.pm_enabled
  if (!enabled) return

  const token = session === 'AM' ? config.am_token : config.pm_token
  const groupId = session === 'AM' ? config.am_group_id : config.pm_group_id
  if (!token || !groupId) return

  // 判斷目前台灣時間是否在通知區間內
  const now = new Date()
  const twHour = (now.getUTCHours() + 8) % 24
  const twMin = now.getUTCMinutes()
  const twTimeStr = `${String(twHour).padStart(2, '0')}:${String(twMin).padStart(2, '0')}`

  const startTime = session === 'AM' ? config.am_start : config.pm_start
  const endTime = session === 'AM' ? config.am_end : config.pm_end

  if (twTimeStr < startTime || twTimeStr > endTime) return

  // 確認是否已推播過
  const { data: existing } = await db
    .from('line_notify_log')
    .select('id')
    .eq('vendor_id', vendorId)
    .eq('date', date)
    .eq('session', session)
    .maybeSingle()

  if (existing) return

  // 取得廠商名稱
  const { data: vendor } = await db
    .from('vendors')
    .select('name')
    .eq('id', vendorId)
    .single()

  if (!vendor) return

  // 計算今日該場次該廠商照片數
  const { count: photoCount } = await db
    .from('records')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .eq('date', date)
    .eq('session', session)

  // 計算今日已回報廠商數（有至少一筆記錄）
  const { data: reportedVendors } = await db
    .from('records')
    .select('vendor_id')
    .eq('date', date)
    .eq('session', session)

  const reportedCount = new Set((reportedVendors ?? []).map((r: { vendor_id: string }) => r.vendor_id)).size

  // 計算總廠商數
  const { count: totalVendors } = await db
    .from('vendors')
    .select('id', { count: 'exact', head: true })

  const sessionLabel = session === 'AM' ? '上午' : '下午'
  const timeLabel = `${String(twHour).padStart(2, '0')}:${String(twMin).padStart(2, '0')}`

  const message = `🔬 ${vendor.name} ${sessionLabel}酒測完成\n報到人數：${photoCount ?? 0} 人\n時間：${timeLabel}\n今日進度：${reportedCount}/${totalVendors ?? 0} 間已回報`

  // 呼叫 LINE Messaging API
  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: groupId,
      messages: [{ type: 'text', text: message }],
    }),
  })

  if (!lineRes.ok) {
    console.error('LINE API error:', await lineRes.text())
    return
  }

  // 寫入 line_notify_log
  await db.from('line_notify_log').insert({
    vendor_id: vendorId,
    date,
    session,
  })
}
