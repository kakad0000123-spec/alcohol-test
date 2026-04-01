import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user || user.type !== 'account') {
    redirect('/')
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <DashboardNav user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
