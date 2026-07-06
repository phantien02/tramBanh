'use client'
import Link from 'next/link'
import type { SessionUser } from '@/lib/session'

export default function AppShell({ user, tieuDe, ketNoi = true, children }: {
  user: SessionUser; tieuDe: string; ketNoi?: boolean; children: React.ReactNode
}) {
  const mucNav = [
    ...(['quay', 'quanly'].includes(user.vaiTro) ? [{ href: '/quay', ten: 'Quầy' }] : []),
    ...(['bep', 'quanly'].includes(user.vaiTro) ? [{ href: '/bep', ten: 'Bếp' }] : []),
    ...(user.vaiTro === 'quanly' ? [{ href: '/quanly', ten: 'Quản lý' }] : []),
  ]
  async function dangXuat() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }
  return (
    <div className="min-h-screen flex flex-col">
      {!ketNoi && (
        <div className="bg-red-600 text-white text-center font-bold py-2 text-lg">
          ⚠️ MẤT KẾT NỐI — dữ liệu không còn cập nhật
        </div>
      )}
      <header className="bg-white shadow flex items-center gap-4 px-4 py-2 sticky top-0 z-10">
        <span className="font-bold text-pink-600 text-xl">🎂 Trạm Bánh</span>
        <nav className="flex gap-2">
          {mucNav.map((m) => (
            <Link key={m.href} href={m.href} className="px-3 py-1.5 rounded-lg hover:bg-pink-50 font-medium">{m.ten}</Link>
          ))}
        </nav>
        <h1 className="ml-auto font-semibold text-gray-500">{tieuDe}</h1>
        <span className="text-sm text-gray-500">{user.hoTen}</span>
        <button onClick={dangXuat} className="text-sm text-gray-400 hover:text-red-600">Đăng xuất</button>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
