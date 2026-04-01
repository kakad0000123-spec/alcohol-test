import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/admin/export — 手動下載備份 JSON
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
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
    exported_by: user.account,
    accounts: accounts.data || [],
    vendors: vendors.data || [],
    records: records.data || [],
    report_config: report_config.data || [],
    report_emails: report_emails.data || [],
  }

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup-${now}.json"`,
    },
  })
}
