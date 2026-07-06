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
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--color-dark-bg)]">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-gold-500)]/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--color-gold-600)]/10 rounded-full blur-[80px] pointer-events-none"></div>
      
      <form onSubmit={dangNhap} className="glass-panel p-10 w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-gold-400)] mb-2 tracking-wide">Trạm Bánh</h1>
          <p className="text-gray-400 text-sm">Hệ thống quản lý nội bộ</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <input 
              className="w-full bg-black/40 border border-[var(--color-dark-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors placeholder-gray-500" 
              placeholder="Tên đăng nhập" 
              value={username}
              onChange={(e) => setUsername(e.target.value)} 
              autoFocus 
              autoCapitalize="none" 
            />
          </div>
          <div>
            <input 
              className="w-full bg-black/40 border border-[var(--color-dark-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors placeholder-gray-500" 
              placeholder="Mật khẩu" 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
        </div>

        {loi && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm text-center font-medium">{loi}</p>
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
