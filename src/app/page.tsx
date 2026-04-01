'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function BreathalyzerIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 吹嘴 */}
      <rect x="34" y="2" width="12" height="8" rx="4" fill="#c73652" />
      {/* 紅色上管 */}
      <rect x="26" y="8" width="28" height="12" rx="6" fill="#e94560" />
      {/* 主機身 */}
      <rect x="18" y="18" width="44" height="42" rx="8" fill="#1a1a2e" />
      {/* LCD 螢幕 */}
      <rect x="24" y="24" width="32" height="20" rx="4" fill="#0d2137" />
      <rect x="26" y="26" width="28" height="16" rx="3" fill="#1a3a50" />
      {/* 螢幕數字 */}
      <text x="40" y="38" textAnchor="middle" fill="#00ff88" fontSize="11" fontFamily="monospace" fontWeight="bold">0.00</text>
      {/* 按鈕列 */}
      <circle cx="30" cy="51" r="5" fill="#2a2a4a" stroke="#3a3a6a" strokeWidth="1.5" />
      <circle cx="40" cy="51" r="5" fill="#2a2a4a" stroke="#3a3a6a" strokeWidth="1.5" />
      <circle cx="50" cy="51" r="5" fill="#e94560" />
      {/* 黑色握把 */}
      <rect x="22" y="60" width="36" height="16" rx="7" fill="#111827" />
      <rect x="27" y="64" width="26" height="2" rx="1" fill="#1f2937" />
      <rect x="27" y="69" width="26" height="2" rx="1" fill="#1f2937" />
      <rect x="27" y="74" width="26" height="2" rx="1" fill="#1f2937" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '登入失敗'); return }
      router.push(data.redirect || '/dashboard')
    } catch {
      setError('網路錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 drop-shadow-lg">
            <BreathalyzerIcon />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">廠商酒測回報系統</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>請輸入您的帳號密碼登入</p>
        </div>

        <div className="rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>帳號</label>
              <input
                type="text"
                value={account}
                onChange={e => setAccount(e.target.value)}
                placeholder="請輸入帳號"
                required
                autoComplete="username"
                className="w-full px-4 py-3 text-sm rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>密碼</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 text-sm rounded-xl"
              />
            </div>

            {error && (
              <div className="text-sm text-center py-2 px-3 rounded-lg" style={{ background: '#2d1a1a', color: '#f87171', border: '1px solid #7f1d1d' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-60 hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                  登入中...
                </span>
              ) : '登入'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-secondary)' }}>
          © {new Date().getFullYear()} 廠商酒測回報系統
        </p>
      </div>
    </div>
  )
}
