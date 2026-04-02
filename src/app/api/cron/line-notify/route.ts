import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 找出 sent=false 且 first_upload_at <= NOW() - 5 分鐘 的記錄
  const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
  const { data: pending } = await db
    .from('line_notify_log')
    .select('id, vendor_id, date, session')
    .eq('sent', false)
    .lte('first_upload_at', threeMinAgo)

  if (!pending || pending.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 取得 LINE 設定
  const { data: config } = await db.from('line_config').select('*').eq('id', 1).single()
  if (!config) return NextResponse.json({ error: 'no config' })

  let sentCount = 0
  for (const record of pending) {
    const session = record.session as 'AM' | 'PM'
    const enabled = session === 'AM' ? config.am_enabled : config.pm_enabled
    if (!enabled) continue
    const token = session === 'AM' ? config.am_token : config.pm_token
    const groupId = session === 'AM' ? config.am_group_id : config.pm_group_id
    if (!token || !groupId) continue

    // 取廠商名稱
    const { data: vendor } = await db.from('vendors').select('name').eq('id', record.vendor_id).single()
    if (!vendor) continue

    // 取該廠商當場次照片數
    const { count: photoCount } = await db
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', record.vendor_id)
      .eq('date', record.date)
      .eq('session', session)

    // 取當天該場次已回報廠商數
    const { data: reportedVendors } = await db
      .from('records')
      .select('vendor_id')
      .eq('date', record.date)
      .eq('session', session)
    const reportedCount = new Set((reportedVendors ?? []).map((r: { vendor_id: string }) => r.vendor_id)).size

    // 取台灣時間 HH:MM
    const now = new Date()
    const twHour = String((now.getUTCHours() + 8) % 24).padStart(2, '0')
    const twMin = String(now.getUTCMinutes()).padStart(2, '0')
    const timeLabel = `${twHour}:${twMin}`

    const message = `${vendor.name} 酒測完成\n報到人數：${photoCount ?? 0}人\n今日進度：${reportedCount}間已回報\n${timeLabel}`

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

    if (lineRes.ok) {
      await db.from('line_notify_log').update({ sent: true }).eq('id', record.id)
      sentCount++
    } else {
      console.error('LINE API error:', await lineRes.text())
    }
  }

  return NextResponse.json({ sent: sentCount })
}
