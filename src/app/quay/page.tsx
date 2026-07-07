'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import OrderCard, { type DonHienThi } from '@/components/OrderCard'
import { useRealtime } from '@/components/useRealtime'
import { dauCuoiNgay, dinhDangNgay } from '@/lib/time'
import type { SessionUser } from '@/lib/session'
import { TEN_TRANG_THAI, type TrangThai } from '@/lib/status'

const COT: TrangThai[] = ['moi', 'dang_lam', 'banh_xong', 'da_nhan']

const MAU_COT: Partial<Record<TrangThai, string>> = {
  moi: 'var(--color-dau)',
  dang_lam: 'var(--color-caramel)',
  banh_xong: 'var(--color-tra)',
  da_nhan: 'var(--color-xam)',
}

export default function QuayPage() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [tab, setTab] = useState<'homnay' | 'saptoi'>('homnay')
  const [q, setQ] = useState('')
  const [dons, setDons] = useState<DonHienThi[]>([])
  const [now, setNow] = useState(Date.now())

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  const taiDon = useCallback(async () => {
    const { dau, cuoi } = dauCuoiNgay(new Date())
    const url = tab === 'homnay'
      ? `/api/orders?den=${cuoi}&trangThai=moi,dang_lam,banh_xong,da_nhan${q ? `&q=${encodeURIComponent(q)}` : ''}`
      : `/api/orders?tu=${cuoi + 1}&trangThai=moi,dang_lam,banh_xong,da_nhan${q ? `&q=${encodeURIComponent(q)}` : ''}`
    // tab hôm nay: den=cuối hôm nay → gồm cả đơn quá hạn hôm trước chưa xong (spec mục 5.6)
    void dau
    const d = await fetch(url).then((r) => r.json())
    setDons(d.orders)
  }, [tab, q])

  useEffect(() => { taiDon() }, [taiDon])
  const { ketNoi } = useRealtime(() => taiDon(), (e) => e.type === 'chuyen_trang_thai' && e.trangThai === 'banh_xong')

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Quầy" ketNoi={ketNoi}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href="/quay/don-moi" className="btn-primary text-xl">＋ Đơn mới</Link>
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-line)]">
          <button onClick={() => setTab('homnay')} className={`px-4 py-2 font-medium ${tab === 'homnay' ? 'bg-[var(--color-dau)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-caphe)]'}`}>Hôm nay</button>
          <button onClick={() => setTab('saptoi')} className={`px-4 py-2 font-medium ${tab === 'saptoi' ? 'bg-[var(--color-dau)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-caphe)]'}`}>Sắp tới</button>
        </div>
        <input className="tb-input flex-1 min-w-48" placeholder="🔍 Tìm mã đơn / tên / SĐT"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {tab === 'homnay' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {COT.map((tt) => {
            const ds = dons.filter((d) => d.trangThai === tt)
            return (
              <div key={tt} className="tb-col space-y-2">
                <h2 className="tb-col-head font-display" style={{ ['--line' as string]: MAU_COT[tt] }}>{TEN_TRANG_THAI[tt]}<span className="tb-count">{ds.length}</span></h2>
                {ds.map((d) => <OrderCard key={d.id} don={d} now={now} onClick={() => router.push(`/quay/don/${d.id}`)} />)}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {[...new Set(dons.map((d) => dinhDangNgay(d.ngayGioNhan)))].map((ngay) => (
            <div key={ngay}>
              <h2 className="font-display font-bold mb-2 text-[var(--color-caphe)]">{ngay}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {dons.filter((d) => dinhDangNgay(d.ngayGioNhan) === ngay).map((d) => (
                  <OrderCard key={d.id} don={d} now={now} onClick={() => router.push(`/quay/don/${d.id}`)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
