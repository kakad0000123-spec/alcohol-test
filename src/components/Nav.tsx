'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

type NavUser = { display_name: string; role: string }

const link: React.CSSProperties = { color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14 }

export default function Nav({ user }: { user: NavUser | null }) {
  const router = useRouter()
  const isAdmin = user?.role === 'superadmin'

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  return (
    <nav style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
      <Link href="/dashboard" style={link}>本週總覽</Link>
      <Link href="/dashboard/stats" style={link}>儀表板</Link>
      {isAdmin && <Link href="/dashboard/settings" style={link}>寄件設定</Link>}
      {isAdmin && <Link href="/dashboard/users" style={link}>帳號管理</Link>}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {user.display_name}{!isAdmin && '（廠商）'}
          </span>
        )}
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 10px', fontSize: 13, cursor: 'pointer' }}>登出</button>
      </span>
    </nav>
  )
}
