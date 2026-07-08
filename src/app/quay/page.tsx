'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import OrderCard, { laShip, type DonHienThi } from '@/components/OrderCard'
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

type LocGiao = 'tatca' | 'ship' | 'taiquan' | 'dagiao'

export default function QuayPage() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [tab, setTab] = useState<'homnay' | 'saptoi'>('homnay')
  const [locGiao, setLocGiao] = useState<LocGiao>('tatca')
  const [cotMobile, setCotMobile] = useState<TrangThai>('moi') // trạng thái đang xem trên điện thoại
  const [q, setQ] = useState('')
  const [dons, setDons] = useState<DonHienThi[]>([])
  const [now, setNow] = useState(Date.now())

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  const taiDon = useCallback(async () => {
    const { dau, cuoi } = dauCuoiNgay(new Date())
    const tk = q ? `&q=${encodeURIComponent(q)}` : ''
    if (tab === 'homnay') {
      // Đơn đang xử lý: den=cuối hôm nay → gồm cả đơn quá hạn hôm trước chưa xong (spec mục 5.6).
      // Đơn đã giao: chỉ trong hôm nay (tu=đầu ngày) để không kéo cả lịch sử.
      const [dXuLy, dGiao] = await Promise.all([
        fetch(`/api/orders?den=${cuoi}&trangThai=moi,dang_lam,banh_xong,da_nhan${tk}`).then((r) => r.json()),
        fetch(`/api/orders?tu=${dau}&den=${cuoi}&trangThai=hoan_tat${tk}`).then((r) => r.json()),
      ])
      setDons([...dXuLy.orders, ...dGiao.orders])
    } else {
      const d = await fetch(`/api/orders?tu=${cuoi + 1}&trangThai=moi,dang_lam,banh_xong,da_nhan${tk}`).then((r) => r.json())
      setDons(d.orders)
    }
  }, [tab, q])

  useEffect(() => { taiDon() }, [taiDon])
  const { ketNoi } = useRealtime(() => taiDon(), (e) => e.type === 'chuyen_trang_thai' && e.trangThai === 'banh_xong')

  // Phân loại theo giao hàng (chỉ áp ở tab Hôm nay)
  const dangXuLy = dons.filter((d) => d.trangThai !== 'hoan_tat' && d.trangThai !== 'huy')
  const daGiao = dons.filter((d) => d.trangThai === 'hoan_tat')
  const soLuong: Record<LocGiao, number> = {
    tatca: dangXuLy.length,
    ship: dangXuLy.filter((d) => laShip(d.hinhThucNhan)).length,
    taiquan: dangXuLy.filter((d) => !laShip(d.hinhThucNhan)).length,
    dagiao: daGiao.length,
  }
  const CHIP: { key: LocGiao; nhan: string }[] = [
    { key: 'tatca', nhan: 'Tất cả' },
    { key: 'ship', nhan: '🛵 Cần ship' },
    { key: 'taiquan', nhan: '🏠 Tại quán' },
    { key: 'dagiao', nhan: '✅ Đã giao' },
  ]
  // đơn đang xử lý sau khi lọc theo chip giao hàng
  const dsLoc = locGiao === 'ship' ? dangXuLy.filter((d) => laShip(d.hinhThucNhan))
    : locGiao === 'taiquan' ? dangXuLy.filter((d) => !laShip(d.hinhThucNhan))
    : dangXuLy

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

      {tab === 'homnay' && (
        <div className="flex flex-wrap gap-2 mb-4">
          {CHIP.map((c) => (
            <button key={c.key} onClick={() => setLocGiao(c.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors border ${
                locGiao === c.key
                  ? 'bg-[var(--color-caphe)] text-white border-[var(--color-caphe)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-caphe)] border-[var(--color-line)] hover:bg-[var(--color-surface-2)]'}`}>
              {c.nhan} <span className="num opacity-80">({soLuong[c.key]})</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'saptoi' ? (
        <div className="space-y-4">
          {[...new Set(dons.map((d) => dinhDangNgay(d.ngayGioNhan)))].map((ngay) => (
            <div key={ngay}>
              <h2 className="font-display font-bold mb-2 text-[var(--color-caphe)]">{ngay}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {dons.filter((d) => dinhDangNgay(d.ngayGioNhan) === ngay).map((d) => (
                  <OrderCard key={d.id} don={d} now={now} onClick={() => router.push(`/quay/don/${d.id}`)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : locGiao === 'dagiao' ? (
        daGiao.length === 0
          ? <p className="text-center text-[var(--color-xam)] text-lg mt-10">Chưa có đơn nào giao xong hôm nay.</p>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              {daGiao.map((d) => <OrderCard key={d.id} don={d} now={now} onClick={() => router.push(`/quay/don/${d.id}`)} />)}
            </div>
          )
      ) : (
        <>
          {/* Điện thoại: tab trạng thái (số đếm để thấy tổng quan) + xem 1 nhóm */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
              {COT.map((tt) => {
                const n = dsLoc.filter((d) => d.trangThai === tt).length
                const active = cotMobile === tt
                return (
                  <button key={tt} onClick={() => setCotMobile(tt)}
                    className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold border transition-colors ${active ? 'text-white' : 'bg-[var(--color-surface)] text-[var(--color-caphe)] border-[var(--color-line)]'}`}
                    style={active ? { background: MAU_COT[tt], borderColor: MAU_COT[tt] } : undefined}>
                    {TEN_TRANG_THAI[tt]} <span className="num">({n})</span>
                  </button>
                )
              })}
            </div>
            <div className="space-y-3">
              {dsLoc.filter((d) => d.trangThai === cotMobile).map((d) => (
                <OrderCard key={d.id} don={d} now={now} onClick={() => router.push(`/quay/don/${d.id}`)} />
              ))}
              {dsLoc.filter((d) => d.trangThai === cotMobile).length === 0 && (
                <p className="text-center text-[var(--color-xam)] mt-8">Không có đơn ở trạng thái này.</p>
              )}
            </div>
          </div>

          {/* Máy tính: kanban 4 cột */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-3 items-start">
            {COT.map((tt) => {
              const ds = dsLoc.filter((d) => d.trangThai === tt)
              return (
                <div key={tt} className="tb-col space-y-2">
                  <h2 className="tb-col-head font-display" style={{ ['--line' as string]: MAU_COT[tt] }}>{TEN_TRANG_THAI[tt]}<span className="tb-count">{ds.length}</span></h2>
                  {ds.map((d) => <OrderCard key={d.id} don={d} now={now} onClick={() => router.push(`/quay/don/${d.id}`)} />)}
                </div>
              )
            })}
          </div>
        </>
      )}
    </AppShell>
  )
}
