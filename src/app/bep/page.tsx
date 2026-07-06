'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import OrderDetail from '@/components/OrderDetail'
import { useRealtime } from '@/components/useRealtime'
import { dauCuoiNgay, dinhDangGio, mucCanhBao } from '@/lib/time'
import type { SessionUser } from '@/lib/session'
import type { TrangThai } from '@/lib/status'

type DonBep = {
  id: number; maDon: string; ngayGioNhan: number; trangThai: TrangThai; daSua: number; ghiChu?: string | null
  khach?: { ten: string } | null
  items: { id: number; tenMon: string; coBanh?: string | null; soLuong: number; chuViet?: string | null; ghiChu?: string | null; anhMau: string[] }[]
}

export default function BepPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [lechNgay, setLechNgay] = useState(0) // 0 = hôm nay, 1 = mai…
  const [dons, setDons] = useState<DonBep[]>([])
  const [now, setNow] = useState(Date.now())
  const [xemChiTiet, setXemChiTiet] = useState<number | null>(null)

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  const taiDon = useCallback(async () => {
    const ngay = new Date(); ngay.setDate(ngay.getDate() + lechNgay)
    const { dau, cuoi } = dauCuoiNgay(ngay)
    // hôm nay: lấy từ đầu thời gian để gồm đơn quá hạn cũ chưa xong; ngày khác: đúng khoảng ngày đó
    const tu = lechNgay === 0 ? 0 : dau
    const d = await fetch(`/api/orders?tu=${tu}&den=${cuoi}&trangThai=moi,dang_lam`).then((r) => r.json())
    setDons(d.orders)
  }, [lechNgay])

  useEffect(() => { taiDon() }, [taiDon])
  const { ketNoi } = useRealtime(
    () => taiDon(),
    (e) => e.type === 'nhac_nho' || e.type === 'don_moi' || e.type === 'don_cap_nhat',
  )

  async function chuyen(id: number, to: TrangThai) {
    const res = await fetch(`/api/orders/${id}/chuyen`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to }),
    })
    if (!res.ok) alert((await res.json()).error)
    taiDon()
  }

  // trễ hạn / sắp đến hạn lên đầu, còn lại theo giờ lấy
  const thuTu = { tre_han: 0, sap_den_han: 1, binh_thuong: 2 }
  const dsSap = [...dons].sort((a, b) =>
    thuTu[mucCanhBao(a, now)] - thuTu[mucCanhBao(b, now)] || a.ngayGioNhan - b.ngayGioNhan)

  const tenNgay = new Date(now + lechNgay * 86400000).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Bếp" ketNoi={ketNoi}>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setLechNgay((x) => x - 1)} disabled={lechNgay === 0}
          className="text-3xl px-4 py-1 bg-white rounded-xl shadow disabled:opacity-30">◀</button>
        <h2 className="text-2xl font-bold w-64 text-center">{lechNgay === 0 ? `Hôm nay (${tenNgay})` : tenNgay}</h2>
        <button onClick={() => setLechNgay((x) => x + 1)} className="text-3xl px-4 py-1 bg-white rounded-xl shadow">▶</button>
        <span className="bg-pink-600 text-white rounded-full px-3 py-1 font-bold">{dsSap.length} đơn</span>
      </div>

      {dsSap.length === 0 && <p className="text-center text-gray-400 text-xl mt-10">Không có đơn nào cần làm 🎉</p>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dsSap.map((d) => {
          const muc = mucCanhBao(d, now)
          const vien = muc === 'tre_han' ? 'border-red-500 bg-red-50 animate-pulse'
            : muc === 'sap_den_han' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'
          return (
            <div key={d.id} className={`border-4 rounded-2xl p-4 shadow space-y-2 ${vien}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{d.maDon}</span>
                {d.daSua === 1 && <span className="bg-orange-500 text-white rounded px-2 py-0.5 font-bold">ĐÃ SỬA</span>}
                <span className="ml-auto text-3xl font-black">{dinhDangGio(d.ngayGioNhan)}</span>
              </div>
              {d.items.map((it) => (
                <div key={it.id} className="border-t pt-2">
                  <div className="text-xl font-bold">{it.soLuong}× {it.tenMon} {it.coBanh && <span className="text-pink-700">({it.coBanh})</span>}</div>
                  {it.chuViet && <div className="text-2xl text-pink-700 font-semibold bg-pink-50 rounded-lg p-2 mt-1">✍️ &ldquo;{it.chuViet}&rdquo;</div>}
                  {it.ghiChu && <div className="text-lg">📝 {it.ghiChu}</div>}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {it.anhMau.map((f) => (
                      <img key={f} src={`/api/uploads/${f}`} alt="mẫu" className="h-24 rounded-lg object-cover cursor-pointer"
                        onClick={() => setXemChiTiet(d.id)} />
                    ))}
                  </div>
                </div>
              ))}
              {d.ghiChu && <div className="text-lg bg-yellow-50 rounded p-2">📝 {d.ghiChu}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setXemChiTiet(d.id)} className="px-4 py-3 rounded-xl bg-gray-100 font-semibold">Chi tiết</button>
                {d.trangThai === 'moi' && (
                  <button onClick={() => chuyen(d.id, 'dang_lam')} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-xl font-bold">👨‍🍳 Nhận làm</button>
                )}
                {d.trangThai === 'dang_lam' && (
                  <button onClick={() => chuyen(d.id, 'banh_xong')} className="flex-1 bg-green-600 text-white rounded-xl py-3 text-xl font-bold">🎂 Xong</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {xemChiTiet != null && (
        <div className="fixed inset-0 bg-black/50 z-20 overflow-auto p-4" onClick={() => setXemChiTiet(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <OrderDetail id={xemChiTiet} vaiTro={user.vaiTro} onDong={() => { setXemChiTiet(null); taiDon() }} />
          </div>
        </div>
      )}
    </AppShell>
  )
}
