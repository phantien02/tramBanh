'use client'
import { useState } from 'react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loi, setLoi] = useState('')
  const [dangGui, setDangGui] = useState(false)

  async function dangNhap(e: React.FormEvent) {
    e.preventDefault()
    setDangGui(true); setLoi('')
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) { window.location.href = '/' }
    else { setLoi((await res.json()).error ?? 'Đăng nhập thất bại'); setDangGui(false) }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--color-bg)]">
      {/* Điểm nhấn caramel/dâu nhẹ nhàng */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(217,138,43,.10)' }}></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'rgba(226,75,106,.08)' }}></div>

      <form onSubmit={dangNhap} className="tb-card p-10 w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <h1 className="font-display text-3xl font-semibold text-[var(--color-caphe)] tracking-tight">Trạm Bánh</h1>
            <span className="tb-ticket-mono text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--color-caramel)] text-[var(--color-caphe)] tracking-widest">24h</span>
          </div>
          <p className="text-[var(--color-xam)] text-sm">Hệ thống quản lý nội bộ</p>
        </div>

        <div className="space-y-4">
          <div>
            <input
              className="tb-input"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoCapitalize="none"
            />
          </div>
          <div>
            <input
              className="tb-input"
              placeholder="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {loi && (
          <div className="rounded-lg p-3" style={{ background: 'rgba(226,75,106,.1)' }}>
            <p className="text-sm text-center font-medium text-[var(--color-dau)]">{loi}</p>
          </div>
        )}

        <button
          disabled={dangGui}
          className="w-full btn-primary disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {dangGui ? 'Đang xác thực...' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  )
}
