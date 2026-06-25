import Nav from '@/components/Nav'
import UsersClient, { type UserRow } from '@/components/UsersClient'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const user = await getAuthUser()
  const db = createServerClient()
  const { data } = await db
    .from('app_users')
    .select('id, account, display_name, role, contractor, active, created_at')
    .order('created_at', { ascending: true })

  return (
    <>
      <Nav user={user} />
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '20px' }}>
        <h1 style={{ fontSize: 20, margin: '4px 0 18px' }}>帳號管理</h1>
        <UsersClient initialUsers={(data || []) as UserRow[]} currentUserId={user?.id || ''} />
      </main>
    </>
  )
}
