'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { AuthUser } from '@/types'

interface Props {
  user: AuthUser
}

const tabs = [
  { key: 'dashboard', label: '看板', icon: '📊' },
  { key: 'vendors', label: '廠商', icon: '🏭' },
  { key: 'users', label: '使用者', icon: '👤', adminOnly: true },
  { key: 'report', label: '日報', icon: '📧' },
  { key: 'history', label: '紀錄', icon: '📋' },
  { key: 'backup', label: '備份', icon: '💾', adminOnly: true },
]

export default function DashboardNav({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const activeTab = pathname.split('/')[2] || 'dashboard'

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
  }

  const visibleTabs = tabs.filter(t => !t.adminOnly || user.role === 'superadmin')

  return (
    <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
      {/* 頂部欄 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 80 80" fill="none">
            <rect x="26" y="8" width="28" height="12" rx="6" fill="#e94560" />
            <rect x="18" y="18" width="44" height="42" rx="8" fill="#1a1a2e" />
            <rect x="24" y="24" width="32" height="20" rx="4" fill="#0d2137" />
            <rect x="26" y="26" width="28" height="16" rx="3" fill="#1a3a50" />
            <text x="40" y="38" textAnchor="middle" fill="#00ff88" fontSize="11" fontFamily="monospace" fontWeight="bold">0.00</text>
            <rect x="22" y="60" width="36" height="16" rx="7" fill="#111827" />
          </svg>
          <span className="font-semibold text-white text-sm hidden sm:block">廠商酒測回報系統</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
            {user.display_name}
            {user.role === 'superadmin' && <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: '#7c3aed22', color: '#a78bfa' }}>超管</span>}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: '#2a1a1a', color: '#f87171', border: '1px solid #7f1d1d' }}
          >
            登出
          </button>
        </div>
      </div>

      {/* Tab 導覽列 */}
      <nav className="flex overflow-x-auto px-2 pb-0">
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => router.push(tab.key === 'dashboard' ? '/dashboard' : `/dashboard/${tab.key}`)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2"
            style={{
              borderBottomColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}
