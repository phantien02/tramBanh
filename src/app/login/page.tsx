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
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={dangNhap} className="bg-white rounded-2xl shadow p-8 w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">🎂 Trạm Bánh</h1>
        <input className="w-full border rounded-lg p-3 text-lg" placeholder="Tên đăng nhập" value={username}
          onChange={(e) => setUsername(e.target.value)} autoFocus autoCapitalize="none" />
        <input className="w-full border rounded-lg p-3 text-lg" placeholder="Mật khẩu" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {loi && <p className="text-red-600 text-sm">{loi}</p>}
        <button disabled={dangGui} className="w-full bg-pink-600 text-white rounded-lg p-3 text-lg font-semibold disabled:opacity-50">
          {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  )
}
