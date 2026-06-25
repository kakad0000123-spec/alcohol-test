import Nav from '@/components/Nav'
import SettingsClient from '@/components/SettingsClient'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getAuthUser()
  const db = createServerClient()
  const [emailsRes, configRes] = await Promise.all([
    db.from('report_emails').select('id, email, label, kind').order('kind').order('created_at'),
    db.from('report_config').select('enabled, mail_from, send_dow').eq('id', 1).single(),
  ])

  const config = configRes.data || { enabled: false, mail_from: null, send_dow: null }

  return (
    <>
      <Nav user={user} />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px' }}>
        <h1 style={{ fontSize: 20, margin: '4px 0 18px' }}>寄件設定</h1>
        <SettingsClient initialEmails={emailsRes.data || []} initialConfig={config} />
      </main>
    </>
  )
}
