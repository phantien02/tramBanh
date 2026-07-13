'use client'
import { useCallback, useEffect, useState } from 'react'
import ChupAnhThanhPham from '@/components/ChupAnhThanhPham'
import { dinhDangGio, dinhDangNgay, dinhDangTien } from '@/lib/time'
import { TEN_TRANG_THAI, type TrangThai, type VaiTro } from '@/lib/status'
import { tinhConLai } from '@/lib/money'

type ChiTiet = {
  id: number; maDon: string; trangThai: TrangThai; nguon: string; ngayGioNhan: number
  hinhThucNhan: string; diaChiShip?: string | null; sdtNguoiNhan?: string | null; tenNguoiNhan?: string | null
  phiShip: number; kieuPhiShip?: 'freeship' | 'theo_app' | null; donQuaTang?: number; tongTien: number; tienCoc: number; hinhThucTt: string; ghiChu?: string | null
  daSua: number; lyDoHuy?: string | null
  khach?: { ten: string; sdt: string } | null
  items: { id: number; tenMon: string; coBanh?: string | null; cot?: string | null; kem?: string | null; mut?: string | null; topping?: string[]; soLuong: number; chuViet?: string | null; ghiChu?: string | null; gia: number; anhMau: string[] }[]
  phuKien?: { id: number; ten: string; gia: number; soLuong: number }[]
  anhThanhPham?: string[]
  events: { id: number; hanhDong: string; chiTiet?: string | null; thoiDiem: number; userId?: number | null; tenNguoiThucHien: string }[]
}

// nút hành động khả dụng theo trạng thái + vai trò
function nutKhaDung(tt: TrangThai, vaiTro: VaiTro): { to: TrangThai; ten: string; can?: 'ketThucKieu' | 'lyDoHuy' }[] {
  const nut: { to: TrangThai; ten: string; can?: 'ketThucKieu' | 'lyDoHuy' }[] = []
  const la = (...v: VaiTro[]) => v.includes(vaiTro) || vaiTro === 'quanly'
  if (tt === 'moi' && la('bep')) nut.push({ to: 'dang_lam', ten: '👨‍🍳 Nhận làm' })
  if (tt === 'moi' && la('quay')) nut.push({ to: 'hoan_tat', ten: '✅ Lấy ngay — hoàn tất', can: 'ketThucKieu' })
  if (tt === 'dang_lam' && la('bep')) nut.push({ to: 'moi', ten: '↩ Trả về hàng chờ' })
  if (tt === 'dang_lam' && la('bep')) nut.push({ to: 'banh_xong', ten: '🎂 Xong' })
  if (tt === 'banh_xong' && la('bep')) nut.push({ to: 'dang_lam', ten: '↩ Hoàn tác — làm lại' })
  if (tt === 'banh_xong' && la('quay')) nut.push({ to: 'da_nhan', ten: '🤝 Đã nhận bánh' })
  if (tt === 'da_nhan' && la('quay')) nut.push({ to: 'hoan_tat', ten: '✅ Hoàn tất', can: 'ketThucKieu' })
  if (tt !== 'hoan_tat' && tt !== 'huy' && la('quay')) nut.push({ to: 'huy', ten: '🗑 Hủy đơn', can: 'lyDoHuy' })
  return nut
}

const TEN_KET_THUC = [['giao_khach', 'Giao khách tại tiệm'], ['da_ship', 'Đã ship'], ['len_tu', 'Lên tủ trưng bày']]

export default function OrderDetail({ id, vaiTro, onDong, onChuyenXong }: { id: number; vaiTro: VaiTro; onDong?: () => void; onChuyenXong?: (to: TrangThai) => void }) {
  const [don, setDon] = useState<ChiTiet | null>(null)
  const [loi, setLoi] = useState('')
  const [hoiKetThuc, setHoiKetThuc] = useState<TrangThai | null>(null) // đang chờ chọn kiểu kết thúc
  const [hoiAnhXong, setHoiAnhXong] = useState(false) // đang chờ chụp ảnh thành phẩm trước khi Xong
  const [dangGuiAnh, setDangGuiAnh] = useState(false)
  const [anhPhongTo, setAnhPhongTo] = useState<string | null>(null) // ảnh mẫu đang mở lightbox

  const tai = useCallback(() => { fetch(`/api/orders/${id}`).then((r) => r.json()).then(setDon) }, [id])
  useEffect(() => { tai() }, [tai])

  async function goiChuyen(to: TrangThai, opts?: { ketThucKieu?: string; lyDoHuy?: string; anhThanhPham?: string[] }) {
    const res = await fetch(`/api/orders/${id}/chuyen`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to, ...opts }),
    })
    const ok = res.ok
    if (!ok) setLoi((await res.json()).error)
    setHoiKetThuc(null)
    if (ok) onChuyenXong?.(to)
    tai()
  }

  async function xongVoiAnh(anh: string[]) {
    setDangGuiAnh(true)
    try {
      await goiChuyen('banh_xong', { anhThanhPham: anh })
      setHoiAnhXong(false)
    } finally {
      setDangGuiAnh(false)
    }
  }

  function chuyen(to: TrangThai, can?: string) {
    if (to === 'banh_xong') { setHoiAnhXong(true); return }
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

  if (!don) return <p className="p-6 text-center text-[var(--color-xam)]">Đang tải thông tin đơn…</p>

  return (
    <div className="max-w-3xl mx-auto tb-card p-6 space-y-6 relative">
      <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4">
        <h1 className="num text-3xl text-[var(--color-caphe)]">{don.maDon}</h1>
        <span className="tb-chip text-sm font-semibold tracking-wide uppercase">{TEN_TRANG_THAI[don.trangThai]}</span>
        {don.daSua === 1 && <span className="tb-chip tb-chip-caramel text-sm font-bold">ĐÃ SỬA</span>}
        {don.donQuaTang === 1 && <span className="tb-chip tb-chip-dau text-sm font-bold">🎁 QUÀ TẶNG</span>}
        {onDong && <button onClick={onDong} className="ml-auto text-2xl px-2 text-[var(--color-xam)] hover:text-[var(--color-caphe)] transition-colors">✕</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-line)]">
           <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider mb-2">Giao nhận</h3>
           <div className="text-lg">
             <span className="inline-block mr-2">🕐</span>
             <b className="num text-[var(--color-caphe)] text-xl">{dinhDangGio(don.ngayGioNhan)}</b>
             <span className="num text-[var(--color-xam)] ml-2">{dinhDangNgay(don.ngayGioNhan)}</span>
           </div>
           {don.hinhThucNhan === 'ship' && (
             <div className="text-[var(--color-caphe)] flex items-start gap-2">
               <span>🛵</span>
               <span>
                 <b>Ship:</b> {don.diaChiShip}
                 {don.donQuaTang === 1 && <span className="block text-sm font-semibold text-[var(--color-dau-600)]">🎁 Đơn quà tặng — khách đặt tặng người nhận</span>}
                 {don.tenNguoiNhan && <span className="block text-sm text-[var(--color-caphe)]">👤 Người nhận: {don.tenNguoiNhan}</span>}
                 {don.sdtNguoiNhan && <span className="block text-sm text-[var(--color-xam)]">📞 SĐT: {don.sdtNguoiNhan}</span>}
                 <span className="block text-sm text-[var(--color-caphe)]">
                   💸 {don.kieuPhiShip === 'theo_app' ? 'Phí ship: theo app ship' : don.kieuPhiShip === 'freeship' ? 'Freeship' : `Phí ship: ${dinhDangTien(don.phiShip)}`}
                 </span>
               </span>
             </div>
           )}
        </div>

        <div className="space-y-3 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-line)]">
           <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider mb-2">Khách hàng</h3>
           <div className="text-[var(--color-caphe)] font-medium text-lg">
             👤 {don.khach?.ten ?? 'Khách lẻ'}
           </div>
           {don.khach?.sdt && <div className="text-[var(--color-caphe)]">📞 {don.khach?.sdt}</div>}
        </div>
      </div>

      {don.ghiChu && <div className="bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-xl p-3 text-[var(--color-caphe)]">📝 <b>Ghi chú đơn:</b> {don.ghiChu}</div>}
      {don.lyDoHuy && <div className="rounded-xl p-3 text-[var(--color-dau-600)]" style={{ background: 'rgba(240,107,163,.1)', border: '1px solid rgba(240,107,163,.3)' }}>❌ <b>Lý do hủy:</b> {don.lyDoHuy}</div>}

      <div className="space-y-3">
        <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider">Chi tiết sản phẩm</h3>
        {don.items.map((it) => (
          <div key={it.id} className="bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-xl p-4 space-y-2 relative">
            <div className="flex justify-between items-start">
              <div className="font-bold text-lg text-[var(--color-caphe)]">
                <span className="num text-[var(--color-caramel-600)] mr-2">{it.soLuong}×</span>
                {it.tenMon}
              </div>
              <div className="num text-[var(--color-caphe)]">{dinhDangTien(it.gia)}</div>
            </div>
            {(it.coBanh || it.cot || it.kem || it.mut || (it.topping && it.topping.length > 0)) && (
              <div className="flex flex-wrap gap-1.5">
                {it.coBanh && <span className="tb-chip tb-chip-caramel text-sm font-semibold">📏 Size: {it.coBanh}</span>}
                {it.cot && <span className="tb-chip text-sm font-semibold">🎂 Cốt: {it.cot}</span>}
                {it.kem && <span className="tb-chip text-sm font-semibold">🍦 Kem: {it.kem}</span>}
                {it.mut && <span className="tb-chip tb-chip-dau text-sm font-semibold">🍓 Mứt: {it.mut}</span>}
                {it.topping && it.topping.length > 0 && <span className="tb-chip tb-chip-tra text-sm font-semibold">✨ Topping: {it.topping.join(', ')}</span>}
              </div>
            )}
            {it.chuViet && <div className="text-[var(--color-dau)] text-lg font-medium px-3 py-1.5 rounded-lg inline-block" style={{ background: 'rgba(240,107,163,.1)' }}>✍️ “{it.chuViet}”</div>}
            {it.ghiChu && <div className="text-[var(--color-xam)] text-sm mt-1">📝 {it.ghiChu}</div>}
            {it.anhMau && it.anhMau.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--color-line)]">
                <div className="flex gap-3 flex-wrap items-start">
                  {it.anhMau.map((f, idx) => (
                    <div key={`${it.id}-${idx}`} className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setAnhPhongTo(f)}
                        className={`block rounded-xl overflow-hidden border border-[var(--color-line)] hover:shadow-[var(--shadow-lift)] transition-shadow cursor-zoom-in ${idx === 0 ? 'ring-2 ring-[var(--color-caramel)]' : ''}`}
                        title="Bấm để phóng to"
                      >
                        <img src={`/api/uploads/${f}`} alt={idx === 0 ? 'ảnh đại diện' : 'mẫu'} className={idx === 0 ? 'h-44 w-44 object-cover' : 'h-32 w-32 object-cover'} />
                      </button>
                      <div className="flex gap-2 justify-center text-xs">
                        <button type="button" onClick={() => setAnhPhongTo(f)} className="tb-btn-ghost !px-2 !py-1 text-xs">🔍 Phóng to</button>
                        <a href={`/api/uploads/${f}`} download className="tb-btn-ghost !px-2 !py-1 text-xs">⬇ Tải về</a>
                      </div>
                      {idx === 0 && <div className="text-center"><span className="tb-chip tb-chip-caramel text-[11px] font-bold">Ảnh đại diện</span></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {don.phuKien && don.phuKien.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider">Phụ kiện mua thêm</h3>
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-xl p-4 space-y-2">
            {don.phuKien.map((p) => (
              <div key={p.id} className="flex justify-between items-center">
                <span className="text-[var(--color-caphe)] font-medium">
                  <span className="num text-[var(--color-caramel-600)] mr-2">{p.soLuong}×</span>🕯 {p.ten}
                </span>
                <span className="num text-[var(--color-caphe)]">{dinhDangTien(p.gia * p.soLuong)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {don.anhThanhPham && don.anhThanhPham.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider">📸 Ảnh thành phẩm</h3>
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-xl p-4 flex gap-3 flex-wrap">
            {don.anhThanhPham.map((f, idx) => (
              <button key={`${f}-${idx}`} type="button" onClick={() => setAnhPhongTo(f)}
                className="block rounded-xl overflow-hidden border border-[var(--color-line)] hover:shadow-[var(--shadow-lift)] transition-shadow cursor-zoom-in" title="Bấm để phóng to">
                <img src={`/api/uploads/${f}`} alt="thành phẩm" className="h-32 w-32 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--color-surface-2)] rounded-xl p-5 border border-[var(--color-line)]">
        <div className="flex justify-between items-center text-lg mb-2">
           <span className="text-[var(--color-xam)]">Tổng tiền</span>
           <span className="num text-[var(--color-caramel-600)] text-xl">{dinhDangTien(don.tongTien)}</span>
        </div>
        <div className="flex justify-between items-center text-lg border-b border-[var(--color-line)] pb-3 mb-3">
           <span className="text-[var(--color-xam)]">Đã cọc</span>
           <span className="num text-[var(--color-caphe)]">{dinhDangTien(don.tienCoc)}</span>
        </div>
        <div className="flex justify-between items-center text-xl">
           <span className="font-semibold text-[var(--color-caramel-600)]">Còn lại phải thu</span>
           <span className="num text-[var(--color-caramel-600)]">{dinhDangTien(tinhConLai(don.tongTien, don.tienCoc))}</span>
        </div>
      </div>

      {loi && <p className="text-[var(--color-dau-600)] p-3 rounded-lg font-medium" style={{ background: 'rgba(240,107,163,.1)' }}>{loi}</p>}

      {hoiKetThuc ? (
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-xl p-5 space-y-4">
          <p className="font-bold text-[var(--color-caramel-600)] text-lg">Bánh được xử lý thế nào?</p>
          <div className="flex gap-3 flex-wrap">
            {TEN_KET_THUC.map(([gt, ten]) => (
              <button key={gt} onClick={() => goiChuyen(hoiKetThuc, { ketThucKieu: gt })}
                className="btn-primary py-2.5 px-5">{ten}</button>
            ))}
            <button onClick={() => setHoiKetThuc(null)} className="tb-btn-ghost px-5 py-2.5">Hủy thao tác</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap pt-2">
          {don.daSua === 1 && (vaiTro === 'bep' || vaiTro === 'quanly') && (
            <button onClick={xacNhanSua} className="bg-[var(--color-caramel)] hover:bg-[var(--color-caramel-600)] text-white rounded-xl px-5 py-3 font-bold transition-colors">
              Đã thấy thay đổi
            </button>
          )}
          {nutKhaDung(don.trangThai, vaiTro).map((n) => {
            const isRed = n.to === 'huy';
            return (
              <button key={n.to} onClick={() => chuyen(n.to, n.can)}
                className={`rounded-xl px-5 py-3 font-bold text-white transition-all duration-300 ${
                  isRed
                    ? 'bg-[var(--color-dau)] hover:bg-[var(--color-dau-600)]'
                    : 'btn-primary'
                }`}>
                {n.ten}
              </button>
            )
          })}
        </div>
      )}

      <details className="text-sm text-[var(--color-xam)] mt-6 pt-4 border-t border-[var(--color-line)]">
        <summary className="cursor-pointer hover:text-[var(--color-caphe)] transition-colors font-medium">Nhật ký hoạt động</summary>
        <ul className="mt-3 space-y-2 bg-[var(--color-surface-2)] p-4 rounded-xl">
          {don.events.map((e) => (
            <li key={e.id} className="flex flex-col sm:flex-row sm:gap-2">
              <span className="num text-[var(--color-xam)] w-36 shrink-0">{new Date(e.thoiDiem).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
              <span className="text-[var(--color-caramel-600)] font-medium w-24 shrink-0">{e.tenNguoiThucHien}</span>
              <span className="text-[var(--color-caphe)]">{e.hanhDong}{e.chiTiet ? ` (${e.chiTiet})` : ''}</span>
            </li>
          ))}
        </ul>
      </details>

      {hoiAnhXong && don && (
        <ChupAnhThanhPham maDon={don.maDon} dangGui={dangGuiAnh}
          onXacNhan={xongVoiAnh} onDong={() => setHoiAnhXong(false)} />
      )}

      {anhPhongTo && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4"
          style={{ background: 'rgba(20,68,74,.8)' }}
          onClick={() => setAnhPhongTo(null)}
        >
          <img
            src={`/api/uploads/${anhPhongTo}`}
            alt="mẫu phóng to"
            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-[var(--shadow-lift)]"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
            <a href={`/api/uploads/${anhPhongTo}`} download className="tb-btn-ghost bg-[var(--color-surface)] px-5 py-2.5">⬇ Tải về</a>
            <button type="button" onClick={() => setAnhPhongTo(null)} className="tb-btn-ghost bg-[var(--color-surface)] px-5 py-2.5">✕ Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}
