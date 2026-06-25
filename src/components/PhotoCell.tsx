'use client'

import { useState } from 'react'

type Photo = { label: string; url: string }

const navBtn: React.CSSProperties = { background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }

export default function PhotoCell({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<number | null>(null)
  if (!photos.length) return <span style={{ color: 'var(--text-secondary)' }}>無</span>

  const go = (d: number) => setActive(a => (a === null ? a : (a + d + photos.length) % photos.length))

  return (
    <>
      <div style={{ display: 'flex', gap: 4 }}>
        {photos.map((p, i) => (
          <button key={i} onClick={() => setActive(i)} title={p.label + '（點擊放大）'}
            style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.label} style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
          </button>
        ))}
      </div>

      {active !== null && (
        <div onClick={() => setActive(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[active].url} alt={photos[active].label}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '96vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 8 }} />
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {photos.length > 1 && <button onClick={() => go(-1)} style={navBtn}>‹ 上一張</button>}
            <span style={{ color: '#fff', fontSize: 14 }}>{photos[active].label}（{active + 1}/{photos.length}）</span>
            {photos.length > 1 && <button onClick={() => go(1)} style={navBtn}>下一張 ›</button>}
            <button onClick={() => setActive(null)} style={navBtn}>關閉 ✕</button>
          </div>
        </div>
      )}
    </>
  )
}
