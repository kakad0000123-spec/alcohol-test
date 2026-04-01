import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase'
import { getTodayDate } from '@/lib/utils'

// POST /api/cron/report — Vercel Cron Job 觸發
export async function POST(req: NextRequest) {
  // 驗證 cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const session = req.nextUrl.searchParams.get('session') as 'AM' | 'PM' || 'AM'
  const date = getTodayDate()
  const db = createServerClient()

  // 檢查日報是否啟用
  const { data: config } = await db.from('report_config').select('*').eq('id', 1).single()
  if (!config?.enabled) {
    return NextResponse.json({ message: '日報已停用' })
  }

  // 取得所有廠商
  const { data: vendors } = await db.from('vendors').select('id, name').order('name')

  // 取得今日紀錄
  const { data: records } = await db
    .from('records')
    .select('vendor_id, session')
    .eq('date', date)
    .eq('session', session)

  const reportedIds = new Set(records?.map(r => r.vendor_id) || [])
  const reported = (vendors || []).filter(v => reportedIds.has(v.id))
  const notReported = (vendors || []).filter(v => !reportedIds.has(v.id))

  // 取得收件人
  const { data: emailRecipients } = await db.from('report_emails').select('email')
  if (!emailRecipients || emailRecipients.length === 0) {
    return NextResponse.json({ message: '沒有收件人' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const sessionLabel = session === 'AM' ? '上午' : '下午'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: sans-serif; color: #333; }
  h1 { color: #1a1a2e; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
  th { background: #f0f0f0; }
  .reported { color: #16a34a; font-weight: bold; }
  .not-reported { color: #dc2626; }
  .summary { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0; }
</style></head>
<body>
  <h1>🍺 廠商酒測回報日報</h1>
  <p>日期：${date} ${sessionLabel}場</p>
  <div class="summary">
    <strong>摘要：</strong>
    已回報 ${reported.length} / 未回報 ${notReported.length} / 總計 ${(vendors || []).length} 家廠商
  </div>
  <h2>✅ 已回報廠商（${reported.length} 家）</h2>
  <table>
    <tr><th>廠商名稱</th></tr>
    ${reported.map(v => `<tr><td class="reported">${v.name}</td></tr>`).join('')}
    ${reported.length === 0 ? '<tr><td>（無）</td></tr>' : ''}
  </table>
  <h2>❌ 未回報廠商（${notReported.length} 家）</h2>
  <table>
    <tr><th>廠商名稱</th></tr>
    ${notReported.map(v => `<tr><td class="not-reported">${v.name}</td></tr>`).join('')}
    ${notReported.length === 0 ? '<tr><td>（全部回報）</td></tr>' : ''}
  </table>
</body>
</html>
  `

  await resend.emails.send({
    from: 'alcohol-test@yourdomain.com',
    to: emailRecipients.map(e => e.email),
    subject: `酒測日報 ${date} ${sessionLabel}場 — 已回報 ${reported.length}/${(vendors || []).length}`,
    html,
  })

  return NextResponse.json({ success: true, reported: reported.length, total: (vendors || []).length })
}
