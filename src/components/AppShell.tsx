'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { SessionUser } from '@/lib/session'

// Màu "tuyến" cho từng khu vực
const MAU_TUYEN: Record<string, string> = {
  '/quay': 'var(--color-dau)',
  '/bep': 'var(--color-caramel)',
  '/quanly': 'var(--color-tra)',
}

function DongHo() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!now) return <span className="tb-clock text-white text-[17px]">--:--</span>
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const dem = now.getHours() >= 18 || now.getHours() < 6
  return (
    <span className="flex items-center gap-2">
      <span className="tb-clock text-white text-[17px]">{hh}:{mm}<span className="text-[var(--color-caramel)]">:{ss}</span></span>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,.08)', color: '#A9D8D5' }}>
        {dem ? '🌙 Ca đêm' : '☀️ Ca ngày'}
      </span>
    </span>
  )
}

export default function AppShell({ user, tieuDe, ketNoi = true, children }: {
  user: SessionUser; tieuDe: string; ketNoi?: boolean; children: React.ReactNode
}) {
  const pathname = usePathname()
  const isQuanLyMode = pathname?.startsWith('/quanly')

  const mucNav = [
    ...(['quay', 'quanly'].includes(user.vaiTro) ? [{ href: '/quay', ten: 'Quầy' }] : []),
    ...(['bep', 'quanly'].includes(user.vaiTro) ? [{ href: '/bep', ten: 'Bếp' }] : []),
    ...(user.vaiTro === 'quanly' ? [{ href: '/quanly', ten: 'Quản lý' }] : []),
  ]

  async function dangXuat() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const canhBao = !ketNoi && (
    <div className="bg-[var(--color-dau)] text-white text-center font-bold py-2 text-sm fixed top-0 w-full z-50">
      ⚠️ MẤT KẾT NỐI — dữ liệu không còn cập nhật
    </div>
  )

  const wordmark = (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Logo Trạm Bánh" className="h-9 w-9 shrink-0" />
      <span className="font-display font-semibold text-white text-2xl tracking-tight">Trạm Bánh</span>
    </span>
  )

  /* ── Chế độ Quản lý: sidebar ── */
  if (isQuanLyMode) {
    const link = (href: string, ten: string, exact = false) => {
      const active = exact ? pathname === href : pathname?.startsWith(href)
      return (
        <Link href={href} className={`block p-3 rounded-xl transition-colors font-medium ${active ? 'bg-[var(--color-surface-2)] text-[var(--color-caramel-600)]' : 'text-[var(--color-caphe)] hover:bg-[var(--color-surface-2)]'}`}>{ten}</Link>
      )
    }
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        {canhBao}
        <aside className="w-auto md:w-64 tb-card m-4 flex flex-col overflow-hidden md:sticky md:top-4 md:h-[calc(100vh-2rem)] p-0">
          <div className="tb-board rounded-t-[1.15rem] px-5 py-4 static">
            {wordmark}
            <p className="text-xs mt-1" style={{ color: '#A9D8D5' }}>Quản trị viên</p>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {link('/quanly', 'Thống kê', true)}
            {link('/quanly/don', 'Đơn hàng')}
            {link('/quanly/banh', 'Sản phẩm')}
            {link('/quanly/nhan-vien', 'Nhân viên')}
            <div className="pt-3 mt-3 border-t border-[var(--color-line)]">
              <p className="text-xs text-[var(--color-xam)] mb-1 uppercase tracking-wider px-2">Khu vực cửa hàng</p>
              <Link href="/quay" className="block p-3 rounded-xl hover:bg-[var(--color-surface-2)] text-[var(--color-caphe)] transition-colors">Vào Quầy</Link>
              <Link href="/bep" className="block p-3 rounded-xl hover:bg-[var(--color-surface-2)] text-[var(--color-caphe)] transition-colors">Vào Bếp</Link>
            </div>
          </nav>
          <div className="p-4 border-t border-[var(--color-line)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{user.hoTen}</span>
              <span className="text-xs text-[var(--color-xam)]">{tieuDe}</span>
            </div>
            <button onClick={dangXuat} className="text-sm text-[var(--color-dau)] p-2 hover:bg-[rgba(240,107,163,.1)] rounded-lg transition-colors" title="Đăng xuất">Thoát</button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:pl-0">
          <div className="tb-card min-h-full p-4 sm:p-6">
            <header className="mb-6 pb-4 border-b border-[var(--color-line)]">
              <h2 className="font-display text-2xl font-semibold text-[var(--color-caphe)]">{tieuDe}</h2>
            </header>
            {children}
          </div>
        </main>
      </div>
    )
  }

  /* ── Chế độ Quầy / Bếp: Bảng Trạm trên đầu ── */
  return (
    <div className="min-h-screen flex flex-col">
      {canhBao}
      <header className="tb-board flex items-center justify-between gap-2 sm:gap-4 flex-wrap px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          {wordmark}
          <nav className="flex items-center gap-1.5">
            {mucNav.map((m) => {
              const active = pathname?.startsWith(m.href)
              const mau = MAU_TUYEN[m.href]
              return (
                <Link key={m.href} href={m.href}
                  className="px-3.5 py-1.5 rounded-lg transition-all font-medium text-sm"
                  style={active
                    ? { background: mau, color: '#fff' }
                    : { color: '#A9D8D5' }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: mau }} />
                  {m.ten}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <DongHo />
          <span className="hidden sm:block h-6 w-px" style={{ background: 'rgba(255,255,255,.15)' }} />
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="font-semibold text-white text-sm">{tieuDe}</span>
            <span className="text-xs" style={{ color: '#A9D8D5' }}>{user.hoTen}</span>
          </div>
          <button onClick={dangXuat} className="text-sm text-[#F7B7D2] hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium" style={{ background: 'rgba(255,255,255,.06)' }}>Đăng xuất</button>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-[1600px] mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
