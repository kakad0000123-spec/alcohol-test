import { getAuthUser } from '@/lib/auth'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const user = await getAuthUser()
  return <DashboardClient user={user!} />
}
