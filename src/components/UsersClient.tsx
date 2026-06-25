'use client'

import { useState } from 'react'

export type UserRow = {
  id: string
  account: string
  display_name: string
  role: 'superadmin' | 'vendor'
  contractor: string | null
  active: boolean
  created_at: string
}

const CONTRACTORS = ['基誠', '偉翔']

const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14 }
const btn: React.CSSProperties = { background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 18 }

function RoleBadge({ role }: { role: string }) {
  const admin = role === 'superadmin'
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: admin ? 'rgba(96,165,250,.15)' : 'rgba(251,146,60,.15)', color: admin ? '#60a5fa' : '#fb923c' }}>{admin ? '超級管理者' : '廠商'}</span>
}

export default function UsersClient({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [account, setAccount] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'superadmin' | 'vendor'>('vendor')
  const [contractor, setContractor] = useState(CONTRACTORS[0])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    setMsg(''); setBusy(true)
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, display_name: displayName, password, role, contractor: role === 'vendor' ? contractor : null }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) {
      setUsers([...users, data.user]); setAccount(''); setDisplayName(''); setPassword('')
    } else setMsg(data.error || '新增失敗')
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setUsers(users.map(u => (u.id === id ? data.user : u)))
    else alert(data.error || '更新失敗')
  }

  async function toggleActive(u: UserRow) {
    await patch(u.id, { active: !u.active })
  }

  async function resetPw(u: UserRow) {
    const pw = window.prompt(`為「${u.account}」設定新密碼：`)
    if (!pw) return
    await patch(u.id, { password: pw })
    alert('密碼已更新')
  }

  async function del(u: UserRow) {
    if (!window.confirm(`確定刪除帳號「${u.account}」？無法復原`)) return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setUsers(users.filter(x => x.id !== u.id))
    else alert(data.error || '刪除失敗')
  }

  return (
    <div>
      <div style={card}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>新增帳號</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...input, flex: '1 1 130px' }} value={account} onChange={e => setAccount(e.target.value)} placeholder="帳號" autoCapitalize="off" />
          <input style={{ ...input, flex: '1 1 120px' }} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="顯示名稱" />
          <input style={{ ...input, flex: '1 1 130px' }} type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="密碼" />
          <select style={input} value={role} onChange={e => setRole(e.target.value as 'superadmin' | 'vendor')}>
            <option value="vendor">廠商</option>
            <option value="superadmin">超級管理者</option>
          </select>
          {role === 'vendor' && (
            <select style={input} value={contractor} onChange={e => setContractor(e.target.value)}>
              {CONTRACTORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={add}>新增</button>
        </div>
        {msg && <p style={{ color: '#f87171', fontSize: 13, margin: '10px 0 0' }}>{msg}</p>}
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '10px 0 0' }}>※ 廠商帳號登入後只看自己 contractor 的資料、可編輯尺寸/位置、可匯出，無法刪除/改狀態/管帳號。</p>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>帳號清單（{users.length}）</h2>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', opacity: u.active ? 1 : 0.5 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{u.account}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.display_name}</span>
            <RoleBadge role={u.role} />
            {u.contractor && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.contractor}</span>}
            {!u.active && <span style={{ fontSize: 12, color: '#f87171' }}>已停用</span>}
            <span style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button style={ghost} onClick={() => resetPw(u)}>重設密碼</button>
              <button style={ghost} onClick={() => toggleActive(u)} disabled={u.id === currentUserId}>{u.active ? '停用' : '啟用'}</button>
              {u.id !== currentUserId && <button style={{ ...ghost, color: '#f87171' }} onClick={() => del(u)}>刪除</button>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
