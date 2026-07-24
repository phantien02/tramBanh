'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import OrderCard, { type DonHienThi } from '@/components/OrderCard'
import OrderDetail from '@/components/OrderDetail'
import ChupAnhThanhPham from '@/components/ChupAnhThanhPham'
import { useRealtime } from '@/components/useRealtime'
import { dauCuoiNgay, mucCanhBao } from '@/lib/time'
import type { SessionUser } from '@/lib/session'
import type { TrangThai } from '@/lib/status'

type Tab = 'can_lam' | 'da_xong'

export default function BepPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [lechNgay, setLechNgay] = useState(0) // 0 = hôm nay, 1 = mai…
  const [tab, setTab] = useState<Tab>('can_lam')
  const [canLam, setCanLam] = useState<DonHienThi[]>([])
  const [daXong, setDaXong] = useState<DonHienThi[]>([])
  const [now, setNow] = useState(Date.now())
  const [xemChiTiet, setXemChiTiet] = useState<number | null>(null)
  const [chupAnhCho, setChupAnhCho] = useState<{ id: number; maDon: string } | null>(null) // đơn đang chờ chụp ảnh thành phẩm
  const [dangGuiAnh, setDangGuiAnh] = useState(false)

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  const taiDon = useCallback(async () => {
    const ngay = new Date(); ngay.setDate(ngay.getDate() + lechNgay)
    const { dau, cuoi } = dauCuoiNgay(ngay)
    // Cần làm hôm nay: lấy từ đầu thời gian để gồm đơn quá hạn cũ chưa xong; ngày khác: đúng khoảng ngày đó
    const tuCanLam = lechNgay === 0 ? 0 : dau
    const [dCan, dXong] = await Promise.all([
      fetch(`/api/orders?tu=${tuCanLam}&den=${cuoi}&trangThai=moi,dang_lam`).then((r) => r.json()),
      fetch(`/api/orders?tu=${dau}&den=${cuoi}&trangThai=banh_xong,da_nhan,hoan_tat`).then((r) => r.json()),
    ])
    // Phòng khi API lỗi/timeout trả về không có mảng orders → tránh crash "not iterable"
    setCanLam(Array.isArray(dCan?.orders) ? dCan.orders : [])
    setDaXong(Array.isArray(dXong?.orders) ? dXong.orders : [])
  }, [lechNgay])

  useEffect(() => { taiDon() }, [taiDon])
  const { ketNoi } = useRealtime(
    () => taiDon(),
    (e) => e.type === 'nhac_nho' || e.type === 'don_moi' || e.type === 'don_cap_nhat',
  )

  async function chuyen(id: number, to: TrangThai, anhThanhPham?: string[]) {
    const res = await fetch(`/api/orders/${id}/chuyen`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to, anhThanhPham }),
    })
    if (!res.ok) alert((await res.json()).error)
    taiDon()
  }

  async function xongVoiAnh(anh: string[]) {
    if (!chupAnhCho) return
    setDangGuiAnh(true)
    try {
      await chuyen(chupAnhCho.id, 'banh_xong', anh)
      setChupAnhCho(null)
    } finally {
      setDangGuiAnh(false)
    }
  }

  async function hoanTac(id: number, to: TrangThai, hoi: string) {
    if (!confirm(hoi)) return
    await chuyen(id, to)
  }

  // trễ hạn / sắp đến hạn lên đầu, còn lại theo giờ lấy
  const thuTu = { tre_han: 0, sap_den_han: 1, binh_thuong: 2 }
  const dsCanLam = [...canLam].sort((a, b) =>
    thuTu[mucCanhBao(a, now)] - thuTu[mucCanhBao(b, now)] || a.ngayGioNhan - b.ngayGioNhan)
  const dsDaXong = [...daXong].sort((a, b) => a.ngayGioNhan - b.ngayGioNhan)

  const tenNgay = new Date(now + lechNgay * 86400000).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Bếp" ketNoi={ketNoi}>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setLechNgay((x) => x - 1)} disabled={lechNgay === 0}
          className="tb-btn-ghost text-3xl px-4 py-1 disabled:opacity-30">◀</button>
        <h2 className="font-display text-2xl font-semibold w-64 text-center text-[var(--color-caphe)]">{lechNgay === 0 ? `Hôm nay (${tenNgay})` : tenNgay}</h2>
        <button onClick={() => setLechNgay((x) => x + 1)} className="tb-btn-ghost text-3xl px-4 py-1">▶</button>
      </div>

      {/* Thanh 2 tab */}
      <div className="flex justify-center gap-2 mb-5">
        <button onClick={() => setTab('can_lam')}
          className={`rounded-xl px-5 py-2.5 text-lg font-bold transition-colors ${
            tab === 'can_lam' ? 'bg-[var(--color-caramel)] text-white' : 'tb-btn-ghost'}`}>
          🔥 Cần làm <span className="num">({dsCanLam.length})</span>
        </button>
        <button onClick={() => setTab('da_xong')}
          className={`rounded-xl px-5 py-2.5 text-lg font-bold transition-colors ${
            tab === 'da_xong' ? 'bg-[var(--color-tra)] text-white' : 'tb-btn-ghost'}`}>
          ✅ Đã xong <span className="num">({dsDaXong.length})</span>
        </button>
      </div>

      {tab === 'can_lam' ? (
        <>
          {dsCanLam.length === 0 && <p className="text-center text-[var(--color-xam)] text-xl mt-10">Không có đơn nào cần làm 🎉</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {dsCanLam.map((d) => (
              <OrderCard key={d.id} don={d} now={now} onClick={() => setXemChiTiet(d.id)}
                actions={
                  d.trangThai === 'moi'
                    ? <button onClick={() => chuyen(d.id, 'dang_lam')} className="flex-1 bg-[var(--color-caramel)] text-white rounded-xl py-2.5 text-lg font-bold">👨‍🍳 Nhận làm</button>
                    : (
                      <>
                        <button onClick={() => hoanTac(d.id, 'moi', `Trả đơn ${d.maDon} về hàng chờ (chưa nhận làm)?`)}
                          className="tb-btn-ghost px-3 py-2.5" title="Trả về hàng chờ">↩</button>
                        <button onClick={() => setChupAnhCho({ id: d.id, maDon: d.maDon })} className="flex-1 bg-[var(--color-tra)] text-white rounded-xl py-2.5 text-lg font-bold">🎂 Xong</button>
                      </>
                    )
                } />
            ))}
          </div>
        </>
      ) : (
        <>
          {dsDaXong.length === 0 && <p className="text-center text-[var(--color-xam)] text-xl mt-10">Chưa có đơn nào xong trong ngày.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {dsDaXong.map((d) => (
              <OrderCard key={d.id} don={d} now={now} onClick={() => setXemChiTiet(d.id)}
                actions={d.trangThai === 'banh_xong'
                  ? <button onClick={() => hoanTac(d.id, 'dang_lam', `Hoàn tác đơn ${d.maDon} — đưa lại vào danh sách đang làm?`)}
                      className="flex-1 bg-[var(--color-caramel)] text-white rounded-xl py-2.5 text-lg font-bold">↩ Hoàn tác</button>
                  : undefined} />
            ))}
          </div>
        </>
      )}

      {chupAnhCho && (
        <ChupAnhThanhPham maDon={chupAnhCho.maDon} dangGui={dangGuiAnh}
          onXacNhan={xongVoiAnh} onDong={() => setChupAnhCho(null)} />
      )}

      {xemChiTiet != null && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4" onClick={() => setXemChiTiet(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <OrderDetail id={xemChiTiet} vaiTro={user.vaiTro} onDong={() => { setXemChiTiet(null); taiDon() }} />
          </div>
        </div>
      )}
    </AppShell>
  )
}
