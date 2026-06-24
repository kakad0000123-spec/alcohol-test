'use client'

import { useState } from 'react'

type Email = { id: string; email: string; label: string | null; kind: string }
type Config = { enabled: boolean; mail_from: string | null; send_dow: number | null }

const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14 }
const btn: React.CSSProperties = { background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 18 }

export default function SettingsClient({ initialEmails, initialConfig }: { initialEmails: Email[]; initialConfig: Config }) {
  const [emails, setEmails] = useState<Email[]>(initialEmails)
  const [config, setConfig] = useState<Config>(initialConfig)
  const [email, setEmail] = useState('')
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState('company')
  const [msg, setMsg] = useState('')

  async function add() {
    setMsg('')
    const res = await fetch('/api/report-emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, label, kind }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { setEmails([...emails, data.email]); setEmail(''); setLabel('') }
    else setMsg(data.error || '新增失敗')
  }

  async function del(id: string) {
    const res = await fetch(`/api/report-emails/${id}`, { method: 'DELETE' })
    if (res.ok) setEmails(emails.filter(e => e.id !== id))
  }

  async function patchConfig(p: Partial<Config>) {
    const next = { ...config, ...p }
    setConfig(next)
    await fetch('/api/report-config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
  }

  const company = emails.filter(e => e.kind !== 'contractor')
  const contractor = emails.filter(e => e.kind === 'contractor')

  return (
    <div>
      <div style={card}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>自動寄送</h2>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={config.enabled} onChange={e => patchConfig({ enabled: e.target.checked })} />
          啟用每週自動打包寄送
        </label>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '8px 0 0' }}>
          ※ 寄送功能本身尚未接上（待 Resend 寄件網域驗證）。此開關與下方收件人會先存好，網域一好即可啟用。
        </p>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>寄件地址（Resend 已驗證網域，例 802bp@yourdomain.com）</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input style={{ ...input, flex: 1 }} value={config.mail_from || ''} onChange={e => setConfig({ ...config, mail_from: e.target.value })} placeholder="尚未設定" />
            <button style={btn} onClick={() => patchConfig({ mail_from: config.mail_from })}>儲存</button>
          </div>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>收件人</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input style={{ ...input, flex: '2 1 200px' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          <input style={{ ...input, flex: '1 1 120px' }} value={label} onChange={e => setLabel(e.target.value)} placeholder="名稱（公司/基誠…）" />
          <select style={input} value={kind} onChange={e => setKind(e.target.value)}>
            <option value="company">公司</option>
            <option value="contractor">廠商</option>
          </select>
          <button style={btn} onClick={add}>新增</button>
        </div>
        {msg && <p style={{ color: '#f87171', fontSize: 13 }}>{msg}</p>}

        {[{ title: '公司', list: company }, { title: '廠商', list: contractor }].map(g => (
          <div key={g.title} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{g.title}（{g.list.length}）</div>
            {g.list.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>—</div> : g.list.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14 }}>{e.email}</span>
                {e.label && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.label}</span>}
                <button onClick={() => del(e.id)} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', color: '#f87171', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>移除</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
