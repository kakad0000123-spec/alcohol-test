import { getAuthUser } from '@/lib/auth'
import ReportClient from '@/components/ReportClient'

export default async function ReportPage() {
  const user = await getAuthUser()
  return <ReportClient user={user!} />
}
