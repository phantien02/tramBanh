'use client'
import { useCallback, useEffect, useState } from 'react'
import { dinhDangGio, dinhDangNgay, dinhDangTien } from '@/lib/time'
import { TEN_TRANG_THAI, type TrangThai, type VaiTro } from '@/lib/status'
import { tinhConLai } from '@/lib/money'

type ChiTiet = {
  id: number; maDon: string; trangThai: TrangThai; nguon: string; ngayGioNhan: number
  hinhThucNhan: string; diaChiShip?: string | null; sdtNguoiNhan?: string | null
  phiShip: number; tongTien: number; tienCoc: number; hinhThucTt: string; ghiChu?: string | null
  daSua: number; lyDoHuy?: string | null
  khach?: { ten: string; sdt: string } | null
  items: { id: number; tenMon: string; coBanh?: string | null; soLuong: number; chuViet?: string | null; ghiChu?: string | null; gia: number; anhMau: string[] }[]
  events: { id: number; hanhDong: string; chiTiet?: string | null; thoiDiem: number; userId?: number | null }[]
}

// nút hành động khả dụng theo trạng thái + vai trò (khớp máy trạng thái Task 4)
function nutKhaDung(tt: TrangThai, vaiTro: VaiTro): { to: TrangThai; ten: string; can?: 'ketThucKieu' | 'lyDoHuy' }[] {
  const nut: { to: TrangThai; ten: string; can?: 'ketThucKieu' | 'lyDoHuy' }[] = []
  const la = (...v: VaiTro[]) => v.includes(vaiTro) || vaiTro === 'quanly'
  if (tt === 'moi' && la('bep')) nut.push({ to: 'dang_lam', ten: '👨‍🍳 Nhận làm' })
  if (tt === 'moi' && la('quay')) nut.push({ to: 'hoan_tat', ten: '✅ Lấy ngay — hoàn tất', can: 'ketThucKieu' })
  if (tt === 'dang_lam' && la('bep')) nut.push({ to: 'banh_xong', ten: '🎂 Xong' })
  if (tt === 'banh_xong' && la('quay')) nut.push({ to: 'da_nhan', ten: '🤝 Đã nhận bánh' })
  if (tt === 'da_nhan' && la('quay')) nut.push({ to: 'hoan_tat', ten: '✅ Hoàn tất', can: 'ketThucKieu' })
  if (tt !== 'hoan_tat' && tt !== 'huy' && la('quay')) nut.push({ to: 'huy', ten: '🗑 Hủy đơn', can: 'lyDoHuy' })
  return nut
}

const TEN_KET_THUC = [['giao_khach', 'Giao khách tại tiệm'], ['da_ship', 'Đã ship'], ['len_tu', 'Lên tủ trưng bày']]

export default function OrderDetail({ id, vaiTro, onDong }: { id: number; vaiTro: VaiTro; onDong?: () => void }) {
  const [don, setDon] = useState<ChiTiet | null>(null)
  const [loi, setLoi] = useState('')
  const [hoiKetThuc, setHoiKetThuc] = useState<TrangThai | null>(null) // đang chờ chọn kiểu kết thúc cho bước chuyển này

  const tai = useCallback(() => { fetch(`/api/orders/${id}`).then((r) => r.json()).then(setDon) }, [id])
  useEffect(() => { tai() }, [tai])

  async function goiChuyen(to: TrangThai, opts?: { ketThucKieu?: string; lyDoHuy?: string }) {
    const res = await fetch(`/api/orders/${id}/chuyen`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to, ...opts }),
    })
    if (!res.ok) setLoi((await res.json()).error)
    setHoiKetThuc(null)
    tai()
  }

  function chuyen(to: TrangThai, can?: string) {
    if (can === 'ketThucKieu') { setHoiKetThuc(to); return } // hiện 3 nút chọn kiểu kết thúc
    if (can === 'lyDoHuy') {
      const lyDoHuy = prompt('Lý do hủy đơn?')
      if (!lyDoHuy) return
      goiChuyen(to, { lyDoHuy })
      return
    }
    goiChuyen(to)
  }

  async function xacNhanSua() {
    await fetch(`/api/orders/${id}/xac-nhan-sua`, { method: 'POST' })
    tai()
  }

  if (!don) return <p className="p-4">Đang tải…</p>
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl p-5 space-y-4 shadow">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{don.maDon}</h1>
        <span className="bg-gray-100 rounded-lg px-2 py-1 text-sm font-semibold">{TEN_TRANG_THAI[don.trangThai]}</span>
        {don.daSua === 1 && <span className="bg-orange-500 text-white rounded-lg px-2 py-1 text-sm font-bold">ĐÃ SỬA</span>}
        {onDong && <button onClick={onDong} className="ml-auto text-2xl px-2">✕</button>}
      </div>

      <div className="text-lg">🕐 <b>{dinhDangGio(don.ngayGioNhan)}</b> — {dinhDangNgay(don.ngayGioNhan)}</div>
      <div>{don.khach?.ten} — {don.khach?.sdt}</div>
      {don.hinhThucNhan === 'ship' && <div>🛵 Ship: {don.diaChiShip} {don.sdtNguoiNhan && `(${don.sdtNguoiNhan})`}</div>}
      {don.ghiChu && <div className="bg-yellow-50 rounded-lg p-2">📝 {don.ghiChu}</div>}
      {don.lyDoHuy && <div className="bg-red-50 rounded-lg p-2">Lý do hủy: {don.lyDoHuy}</div>}

      {don.items.map((it) => (
        <div key={it.id} className="border rounded-xl p-3 space-y-1">
          <div className="font-bold text-lg">{it.soLuong}× {it.tenMon} {it.coBanh && `(${it.coBanh})`} — {dinhDangTien(it.gia)}</div>
          {it.chuViet && <div className="text-pink-700 text-xl font-semibold">✍️ “{it.chuViet}”</div>}
          {it.ghiChu && <div className="text-gray-600">📝 {it.ghiChu}</div>}
          <div className="flex gap-2 flex-wrap">
            {it.anhMau.map((f) => <img key={f} src={`/api/uploads/${f}`} alt="mẫu" className="h-28 rounded-lg object-cover" />)}
          </div>
        </div>
      ))}

      <div className="text-lg space-x-4">
        <span>Tổng: <b>{dinhDangTien(don.tongTien)}</b></span>
        <span>Cọc: {dinhDangTien(don.tienCoc)}</span>
        <span className="text-pink-700 font-bold">Còn lại: {dinhDangTien(tinhConLai(don.tongTien, don.tienCoc))}</span>
      </div>

      {loi && <p className="text-red-600 font-medium">{loi}</p>}
      {hoiKetThuc ? (
        <div className="bg-green-50 rounded-xl p-3 space-y-2">
          <p className="font-semibold">Bánh được xử lý thế nào?</p>
          <div className="flex gap-2 flex-wrap">
            {TEN_KET_THUC.map(([gt, ten]) => (
              <button key={gt} onClick={() => goiChuyen(hoiKetThuc, { ketThucKieu: gt })}
                className="bg-green-600 text-white rounded-xl px-4 py-3 font-bold">{ten}</button>
            ))}
            <button onClick={() => setHoiKetThuc(null)} className="rounded-xl px-4 py-3 border">Quay lại</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {don.daSua === 1 && (vaiTro === 'bep' || vaiTro === 'quanly') && (
            <button onClick={xacNhanSua} className="bg-orange-500 text-white rounded-xl px-4 py-3 font-bold">Đã thấy thay đổi</button>
          )}
          {nutKhaDung(don.trangThai, vaiTro).map((n) => (
            <button key={n.to} onClick={() => chuyen(n.to, n.can)}
              className={`rounded-xl px-4 py-3 font-bold text-white ${n.to === 'huy' ? 'bg-red-600' : 'bg-green-600'}`}>{n.ten}</button>
          ))}
        </div>
      )}

      <details className="text-sm text-gray-500">
        <summary className="cursor-pointer">Nhật ký đơn</summary>
        <ul className="mt-1 space-y-0.5">
          {don.events.map((e) => (
            <li key={e.id}>{new Date(e.thoiDiem).toLocaleString('vi-VN')} — {e.hanhDong}{e.chiTiet ? ` (${e.chiTiet})` : ''}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
