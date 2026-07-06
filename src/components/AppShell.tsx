'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/lib/session'

export default function AppShell({ user, tieuDe, ketNoi = true, children }: {
  user: SessionUser; tieuDe: string; ketNoi?: boolean; children: React.ReactNode
}) {
  const pathname = usePathname();
  const isQuanLyMode = pathname?.startsWith('/quanly');

  const mucNav = [
    ...(['quay', 'quanly'].includes(user.vaiTro) ? [{ href: '/quay', ten: 'Quầy' }] : []),
    ...(['bep', 'quanly'].includes(user.vaiTro) ? [{ href: '/bep', ten: 'Bếp' }] : []),
    ...(user.vaiTro === 'quanly' ? [{ href: '/quanly', ten: 'Quản lý' }] : []),
  ]

  async function dangXuat() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  // Cảnh báo mất kết nối dùng chung
  const connectionWarning = !ketNoi && (
    <div className="bg-red-900/80 text-red-100 text-center font-bold py-2 text-sm backdrop-blur-sm fixed top-0 w-full z-50">
      ⚠️ MẤT KẾT NỐI — dữ liệu không còn cập nhật
    </div>
  );

  if (isQuanLyMode) {
    return (
      <div className="flex min-h-screen relative pt-0">
        {connectionWarning}
        {/* Sidebar */}
        <aside className="w-64 glass-panel m-4 flex flex-col overflow-hidden sticky top-4 h-[calc(100vh-2rem)]">
          <div className="p-6 border-b border-[var(--color-dark-border)]">
            <h1 className="text-2xl font-bold text-[var(--color-gold-400)] tracking-wide">Trạm Bánh</h1>
            <p className="text-xs text-gray-400 mt-1">Quản trị viên</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {/* Các link quản lý */}
            <Link href="/quanly" className={`block p-3 rounded-xl transition-colors ${pathname === '/quanly' ? 'bg-white/10 text-[var(--color-gold-400)] font-medium' : 'hover:bg-white/5 text-gray-300'}`}>Thống kê</Link>
            <Link href="/quanly/don" className={`block p-3 rounded-xl transition-colors ${pathname?.startsWith('/quanly/don') ? 'bg-white/10 text-[var(--color-gold-400)] font-medium' : 'hover:bg-white/5 text-gray-300'}`}>Đơn hàng</Link>
            <Link href="/quanly/banh" className={`block p-3 rounded-xl transition-colors ${pathname?.startsWith('/quanly/banh') ? 'bg-white/10 text-[var(--color-gold-400)] font-medium' : 'hover:bg-white/5 text-gray-300'}`}>Sản phẩm</Link>
            <Link href="/quanly/nhan-vien" className={`block p-3 rounded-xl transition-colors ${pathname?.startsWith('/quanly/nhan-vien') ? 'bg-white/10 text-[var(--color-gold-400)] font-medium' : 'hover:bg-white/5 text-gray-300'}`}>Nhân viên</Link>
            
            <div className="pt-4 mt-4 border-t border-[var(--color-dark-border)]">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider px-2">Khu vực cửa hàng</p>
              <Link href="/quay" className="block p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-colors">Vào Quầy</Link>
              <Link href="/bep" className="block p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-colors">Vào Bếp</Link>
            </div>
          </nav>
          
          <div className="p-4 border-t border-[var(--color-dark-border)] flex items-center justify-between bg-black/20">
             <div className="flex flex-col">
               <span className="text-sm font-medium text-gray-200">{user.hoTen}</span>
               <span className="text-xs text-gray-500">{tieuDe}</span>
             </div>
             <button onClick={dangXuat} className="text-sm text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Đăng xuất">
                Thoát
             </button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-4 pl-0">
          <div className="glass-panel min-h-full p-6">
            <header className="mb-6 pb-4 border-b border-[var(--color-dark-border)]">
               <h2 className="text-xl font-semibold text-[var(--color-gold-300)]">{tieuDe}</h2>
            </header>
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Top Header cho Quầy / Bếp
  return (
    <div className="min-h-screen flex flex-col relative pt-0">
      {connectionWarning}
      <header className="glass-panel mx-4 mt-4 mb-6 rounded-2xl flex items-center justify-between p-4 px-6 sticky top-4 z-40">
        <div className="flex items-center gap-8">
          <span className="font-bold text-[var(--color-gold-400)] text-xl tracking-wide">Trạm Bánh</span>
          <nav className="flex items-center gap-2">
            {mucNav.map((m) => {
              const isActive = pathname?.startsWith(m.href);
              return (
                <Link key={m.href} href={m.href} 
                  className={`px-4 py-2 rounded-xl transition-all font-medium ${isActive ? 'bg-[var(--color-gold-500)] text-black shadow-lg shadow-gold-500/20' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                  {m.ten}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <h1 className="font-semibold text-[var(--color-gold-300)]">{tieuDe}</h1>
            <span className="text-xs text-gray-400">{user.hoTen}</span>
          </div>
          <div className="h-8 w-px bg-[var(--color-dark-border)]"></div>
          <button onClick={dangXuat} className="text-sm text-red-400 p-2 px-3 hover:bg-red-500/10 rounded-lg transition-colors font-medium">Đăng xuất</button>
        </div>
      </header>
      <main className="flex-1 px-4 pb-8 max-w-[1600px] mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
