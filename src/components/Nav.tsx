'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const link: React.CSSProperties = { color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14 }

export default function Nav() {
  const router = useRouter()
  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }
  return (
    <nav style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
      <Link href="/dashboard" style={link}>本週總覽</Link>
      <Link href="/dashboard/settings" style={link}>寄件設定</Link>
      <button onClick={logout} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 10px', fontSize: 13, cursor: 'pointer' }}>登出</button>
    </nav>
  )
}
