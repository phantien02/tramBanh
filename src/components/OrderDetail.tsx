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
  events: { id: number; hanhDong: string; chiTiet?: string | null; thoiDiem: number; userId?: number | null; tenNguoiThucHien: string }[]
}

// nút hành động khả dụng theo trạng thái + vai trò
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
  const [hoiKetThuc, setHoiKetThuc] = useState<TrangThai | null>(null) // đang chờ chọn kiểu kết thúc

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
    if (can === 'ketThucKieu') { setHoiKetThuc(to); return }
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

  if (!don) return <p className="p-6 text-center text-gray-400">Đang tải thông tin đơn…</p>

  return (
    <div className="max-w-3xl mx-auto glass-panel p-6 space-y-6 relative">
      <div className="flex items-center gap-3 border-b border-[var(--color-dark-border)] pb-4">
        <h1 className="text-3xl font-bold text-[var(--color-gold-400)]">{don.maDon}</h1>
        <span className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm font-semibold tracking-wide uppercase">{TEN_TRANG_THAI[don.trangThai]}</span>
        {don.daSua === 1 && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded-lg px-3 py-1.5 text-sm font-bold shadow-[0_0_10px_rgba(249,115,22,0.3)]">ĐÃ SỬA</span>}
        {onDong && <button onClick={onDong} className="ml-auto text-2xl px-2 text-gray-400 hover:text-white transition-colors">✕</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-[var(--color-dark-border)]">
           <h3 className="text-[var(--color-gold-500)] text-sm font-semibold uppercase tracking-wider mb-2">Giao nhận</h3>
           <div className="text-lg">
             <span className="inline-block mr-2">🕐</span>
             <b className="text-white text-xl">{dinhDangGio(don.ngayGioNhan)}</b> 
             <span className="text-gray-400 ml-2">{dinhDangNgay(don.ngayGioNhan)}</span>
           </div>
           {don.hinhThucNhan === 'ship' && (
             <div className="text-gray-300 flex items-start gap-2">
               <span>🛵</span>
               <span>
                 <b>Ship:</b> {don.diaChiShip}
                 {don.sdtNguoiNhan && <span className="block text-sm text-gray-400">SĐT: {don.sdtNguoiNhan}</span>}
               </span>
             </div>
           )}
        </div>

        <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-[var(--color-dark-border)]">
           <h3 className="text-[var(--color-gold-500)] text-sm font-semibold uppercase tracking-wider mb-2">Khách hàng</h3>
           <div className="text-white font-medium text-lg">
             👤 {don.khach?.ten ?? 'Khách lẻ'}
           </div>
           {don.khach?.sdt && <div className="text-gray-300">📞 {don.khach?.sdt}</div>}
        </div>
      </div>

      {don.ghiChu && <div className="bg-[var(--color-gold-500)]/10 border border-[var(--color-gold-500)]/30 rounded-xl p-3 text-white">📝 <b>Ghi chú đơn:</b> {don.ghiChu}</div>}
      {don.lyDoHuy && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-200">❌ <b>Lý do hủy:</b> {don.lyDoHuy}</div>}

      <div className="space-y-3">
        <h3 className="text-[var(--color-gold-500)] text-sm font-semibold uppercase tracking-wider">Chi tiết sản phẩm</h3>
        {don.items.map((it) => (
          <div key={it.id} className="bg-black/30 border border-[var(--color-dark-border)] rounded-xl p-4 space-y-2 relative">
            <div className="flex justify-between items-start">
              <div className="font-bold text-lg text-white">
                <span className="text-[var(--color-gold-400)] mr-2">{it.soLuong}×</span>
                {it.tenMon} {it.coBanh && <span className="text-gray-400 text-base font-normal">({it.coBanh})</span>}
              </div>
              <div className="font-bold text-gray-300">{dinhDangTien(it.gia)}</div>
            </div>
            {it.chuViet && <div className="text-pink-400 text-lg font-medium bg-pink-500/10 px-3 py-1.5 rounded-lg inline-block">✍️ “{it.chuViet}”</div>}
            {it.ghiChu && <div className="text-gray-400 text-sm mt-1">📝 {it.ghiChu}</div>}
            {it.anhMau && it.anhMau.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-[var(--color-dark-border)]">
                {it.anhMau.map((f) => <img key={f} src={`/api/uploads/${f}`} alt="mẫu" className="h-24 w-24 rounded-lg object-cover border border-white/10" />)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-black/40 rounded-xl p-5 border border-[var(--color-dark-border)]">
        <div className="flex justify-between items-center text-lg mb-2">
           <span className="text-gray-400">Tổng tiền</span>
           <span className="font-bold text-white text-xl">{dinhDangTien(don.tongTien)}</span>
        </div>
        <div className="flex justify-between items-center text-lg border-b border-white/10 pb-3 mb-3">
           <span className="text-gray-400">Đã cọc</span>
           <span className="font-bold text-gray-300">{dinhDangTien(don.tienCoc)}</span>
        </div>
        <div className="flex justify-between items-center text-xl">
           <span className="font-semibold text-[var(--color-gold-400)]">Còn lại phải thu</span>
           <span className="font-bold text-[var(--color-gold-400)]">{dinhDangTien(tinhConLai(don.tongTien, don.tienCoc))}</span>
        </div>
      </div>

      {loi && <p className="text-red-400 bg-red-500/10 p-3 rounded-lg font-medium">{loi}</p>}
      
      {hoiKetThuc ? (
        <div className="bg-[var(--color-gold-500)]/10 border border-[var(--color-gold-500)]/30 rounded-xl p-5 space-y-4">
          <p className="font-bold text-[var(--color-gold-400)] text-lg">Bánh được xử lý thế nào?</p>
          <div className="flex gap-3 flex-wrap">
            {TEN_KET_THUC.map(([gt, ten]) => (
              <button key={gt} onClick={() => goiChuyen(hoiKetThuc, { ketThucKieu: gt })}
                className="btn-primary py-2.5 px-5">{ten}</button>
            ))}
            <button onClick={() => setHoiKetThuc(null)} className="rounded-xl px-5 py-2.5 border border-[var(--color-dark-border)] text-white hover:bg-white/10 transition-colors">Hủy thao tác</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap pt-2">
          {don.daSua === 1 && (vaiTro === 'bep' || vaiTro === 'quanly') && (
            <button onClick={xacNhanSua} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 py-3 font-bold transition-colors shadow-lg shadow-orange-500/20">
              Đã thấy thay đổi
            </button>
          )}
          {nutKhaDung(don.trangThai, vaiTro).map((n) => {
            const isRed = n.to === 'huy';
            return (
              <button key={n.to} onClick={() => chuyen(n.to, n.can)}
                className={`rounded-xl px-5 py-3 font-bold text-white transition-all duration-300 shadow-lg ${
                  isRed 
                    ? 'bg-red-600/80 hover:bg-red-500 shadow-red-900/50' 
                    : 'btn-primary'
                }`}>
                {n.ten}
              </button>
            )
          })}
        </div>
      )}

      <details className="text-sm text-gray-500 mt-6 pt-4 border-t border-[var(--color-dark-border)]">
        <summary className="cursor-pointer hover:text-gray-300 transition-colors font-medium">Nhật ký hoạt động</summary>
        <ul className="mt-3 space-y-2 bg-black/20 p-4 rounded-xl">
          {don.events.map((e) => (
            <li key={e.id} className="flex flex-col sm:flex-row sm:gap-2">
              <span className="text-gray-400 w-36 shrink-0">{new Date(e.thoiDiem).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
              <span className="text-[var(--color-gold-500)] font-medium w-24 shrink-0">{e.tenNguoiThucHien}</span>
              <span className="text-gray-300">{e.hanhDong}{e.chiTiet ? ` (${e.chiTiet})` : ''}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
