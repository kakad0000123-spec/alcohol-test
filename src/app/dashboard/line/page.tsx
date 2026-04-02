import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LineClient from '@/components/LineClient'

export default async function LinePage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'superadmin') {
    redirect('/dashboard')
  }
  return <LineClient user={user} />
}
