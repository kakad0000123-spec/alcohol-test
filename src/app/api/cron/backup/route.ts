import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase'

// POST /api/cron/backup — 每週日凌晨備份
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const db = createServerClient()
  const now = new Date().toISOString().split('T')[0]

  const [accounts, vendors, records, report_config, report_emails] = await Promise.all([
    db.from('accounts').select('id, account, display_name, role, created_at'),
    db.from('vendors').select('id, name, contact, account, created_at'),
    db.from('records').select('id, vendor_id, date, session, file_hash, uploaded_at'),
    db.from('report_config').select('*'),
    db.from('report_emails').select('*'),
  ])

  const backup = {
    exported_at: new Date().toISOString(),
    accounts: accounts.data || [],
    vendors: vendors.data || [],
    records: records.data || [],
    report_config: report_config.data || [],
    report_emails: report_emails.data || [],
  }

  const json = JSON.stringify(backup, null, 2)

  // 取得 superadmin email（從 report_emails 取第一個，或使用預設）
  const { data: emailRecipients } = await db.from('report_emails').select('email').limit(1)
  const toEmail = emailRecipients?.[0]?.email

  if (!toEmail) {
    return NextResponse.json({ message: '沒有設定收件 Email，跳過備份寄送', success: true })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'alcohol-test@yourdomain.com',
    to: [toEmail],
    subject: `酒測系統週備份 — ${now}`,
    html: `<p>請見附件，為 ${now} 的系統備份。</p>`,
    attachments: [
      {
        filename: `backup-${now}.json`,
        content: Buffer.from(json).toString('base64'),
      },
    ],
  })

  return NextResponse.json({ success: true, date: now })
}
