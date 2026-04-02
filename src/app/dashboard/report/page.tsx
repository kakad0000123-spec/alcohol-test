import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportClient from '@/components/ReportClient'

export default async function ReportPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'superadmin') {
    redirect('/dashboard')
  }
  return <ReportClient user={user} />
}
