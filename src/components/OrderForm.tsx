'use client'
import { useEffect, useState } from 'react'
import { tinhTongTien, tinhConLai } from '@/lib/money'
import { dinhDangTien } from '@/lib/time'

type Size = { id: number; tenCo: string; gia: number }
type SanPham = { id: number; ten: string; nhom: string; anh: string | null; active: number; sizes: Size[] }
type MonNhap = { productId?: number; tenMon: string; coBanh?: string; soLuong: number; chuViet?: string; ghiChu?: string; gia: number; anhMau: string[] }

export type GiaTriForm = {
  khach: { sdt: string; ten: string }
  nguon: string; ngayGioNhan: number; hinhThucNhan: string
  diaChiShip?: string; sdtNguoiNhan?: string; phiShip: number
  tienCoc: number; hinhThucTt: string; ghiChu?: string; tongTienGhiDe?: number
  items: MonNhap[]
}

const NGUON = [['tai_quay', 'Tại quầy'], ['zalo', 'Zalo'], ['messenger', 'Messenger'], ['dien_thoai', 'Điện thoại'], ['khac', 'Khác']]
const NHAN = [['tai_tiem', 'Nhận tại tiệm'], ['ship', 'Ship'], ['tu_trung_bay', 'Tủ trưng bày']]
const TT = [['chua_tt', 'Chưa thanh toán'], ['tien_mat', 'Tiền mặt'], ['chuyen_khoan', 'Chuyển khoản']]

function toLocalInput(ms: number) {
  const d = new Date(ms - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

export default function OrderForm({ donCu, onLuu, dangLuu, loi }: {
  donCu?: GiaTriForm; onLuu: (v: GiaTriForm) => void; dangLuu: boolean; loi?: string
}) {
  const [sanPham, setSanPham] = useState<SanPham[]>([])
  const [v, setV] = useState<GiaTriForm>(donCu ?? {
    khach: { sdt: '', ten: '' }, nguon: 'tai_quay',
    ngayGioNhan: Date.now() + 30 * 60000, hinhThucNhan: 'tai_tiem',
    phiShip: 0, tienCoc: 0, hinhThucTt: 'chua_tt', items: [],
  })
  const [ghiDeTien, setGhiDeTien] = useState(donCu?.tongTienGhiDe != null)

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then((d) => setSanPham(d.products.filter((p: SanPham) => p.active)))
  }, [])

  // autocomplete khách quen theo SĐT
  async function traSdt(sdt: string) {
    setV((x) => ({ ...x, khach: { ...x.khach, sdt } }))
    if (sdt.length >= 9) {
      const khach = await fetch(`/api/customers?sdt=${sdt}`).then((r) => r.json())
      if (khach) setV((x) => ({ ...x, khach: { sdt, ten: khach.ten } }))
    }
  }

  function themMon(p: SanPham) {
    const size = p.sizes[0]
    setV((x) => ({ ...x, items: [...x.items, { productId: p.id, tenMon: p.ten, coBanh: size?.tenCo, soLuong: 1, gia: size?.gia ?? 0, anhMau: [] }] }))
  }

  function suaMon(i: number, patch: Partial<MonNhap>) {
    setV((x) => ({ ...x, items: x.items.map((m, j) => (j === i ? { ...m, ...patch } : m)) }))
  }

  async function themAnh(i: number, file: File) {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { alert(`Tải ảnh thất bại: ${data.error}`); return }
    suaMon(i, { anhMau: [...v.items[i].anhMau, data.filePath] })
  }

  const tongTinh = tinhTongTien(v.items, v.phiShip)
  const tongTien = ghiDeTien && v.tongTienGhiDe != null ? v.tongTienGhiDe : tongTinh

  return (
    <form className="max-w-4xl mx-auto space-y-6 pb-20" onSubmit={(e) => { e.preventDefault(); onLuu({ ...v, tongTienGhiDe: ghiDeTien ? tongTien : undefined }) }}>
      
      {/* Khách + Nguồn */}
      <section className="glass-panel p-6 space-y-4">
        <h3 className="text-[var(--color-gold-500)] text-sm font-semibold uppercase tracking-wider border-b border-white/10 pb-2 mb-4">Thông tin Khách hàng</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required className="bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors placeholder-gray-500" placeholder="Số điện thoại *" inputMode="tel"
            value={v.khach.sdt} onChange={(e) => traSdt(e.target.value)} />
          <input required className="bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors placeholder-gray-500" placeholder="Tên khách hàng *"
            value={v.khach.ten} onChange={(e) => setV({ ...v, khach: { ...v.khach, ten: e.target.value } })} />
        </div>
        
        <div className="pt-2">
          <p className="text-sm text-gray-400 mb-2">Nguồn đơn:</p>
          <div className="flex gap-2 flex-wrap">
            {NGUON.map(([gt, ten]) => (
              <button type="button" key={gt} onClick={() => setV({ ...v, nguon: gt })}
                className={`px-4 py-2 rounded-xl border transition-colors ${v.nguon === gt ? 'bg-[var(--color-gold-500)] text-black font-semibold border-[var(--color-gold-500)] shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-[var(--color-dark-border)] text-gray-300 hover:bg-white/10'}`}>{ten}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Chọn bánh */}
      <section className="glass-panel p-6 space-y-5">
        <h3 className="text-[var(--color-gold-500)] text-sm font-semibold uppercase tracking-wider border-b border-white/10 pb-2 mb-4 flex justify-between items-center">
          <span>Chi tiết Sản phẩm</span>
          <span className="text-gray-400 text-xs font-normal bg-black/30 px-2 py-1 rounded">Đã chọn {v.items.length} món</span>
        </h3>
        
        {/* Menu chọn */}
        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
          {sanPham.map((p) => (
            <button type="button" key={p.id} onClick={() => themMon(p)}
              className="shrink-0 bg-black/40 border border-[var(--color-dark-border)] rounded-2xl p-2 w-32 hover:border-[var(--color-gold-500)] transition-colors group text-center flex flex-col">
              {p.anh ? <img src={`/api/uploads/${p.anh}`} alt="" className="h-20 w-full object-cover rounded-xl group-hover:opacity-80 transition-opacity" /> : <div className="h-20 bg-white/5 rounded-xl flex items-center justify-center text-3xl">🎂</div>}
              <div className="text-sm mt-2 text-gray-300 group-hover:text-[var(--color-gold-400)] leading-tight px-1 flex-1 flex items-center justify-center">{p.ten}</div>
            </button>
          ))}
          <button type="button" onClick={() => setV((x) => ({ ...x, items: [...x.items, { tenMon: '', soLuong: 1, gia: 0, anhMau: [] }] }))}
            className="shrink-0 border-2 border-dashed border-[var(--color-dark-border)] rounded-2xl p-2 w-32 text-center text-gray-500 hover:border-[var(--color-gold-500)] hover:text-[var(--color-gold-400)] transition-colors flex flex-col">
            <div className="h-20 flex items-center justify-center text-3xl">＋</div>
            <div className="text-sm mt-2 leading-tight px-1 flex-1 flex items-center justify-center">Sản phẩm tuỳ chọn</div>
          </button>
        </div>

        {/* Danh sách đã chọn */}
        <div className="space-y-4">
          {v.items.map((m, i) => {
            const p = sanPham.find((s) => s.id === m.productId)
            return (
              <div key={i} className="bg-black/30 border border-[var(--color-dark-border)] rounded-2xl p-5 space-y-4 relative group">
                <button type="button" onClick={() => setV((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-400 font-bold px-2 py-1 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                
                <div className="flex gap-3 flex-wrap items-center pt-2 md:pt-0">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs text-gray-500 mb-1">Tên món</p>
                    <input required className="w-full bg-black/50 border border-[var(--color-dark-border)] rounded-xl p-2.5 text-[var(--color-gold-300)] font-medium focus:outline-none focus:border-[var(--color-gold-500)] transition-colors" placeholder="Tên bánh *"
                      value={m.tenMon} onChange={(e) => suaMon(i, { tenMon: e.target.value })} />
                  </div>
                  
                  <div className="w-32">
                    <p className="text-xs text-gray-500 mb-1">Kích cỡ</p>
                    {p ? (
                      <select className="w-full bg-black/50 border border-[var(--color-dark-border)] rounded-xl p-2.5 text-white focus:outline-none focus:border-[var(--color-gold-500)]" value={m.coBanh}
                        onChange={(e) => {
                          const size = p.sizes.find((s) => s.tenCo === e.target.value)
                          suaMon(i, { coBanh: e.target.value, gia: size?.gia ?? m.gia })
                        }}>
                        {p.sizes.map((s) => <option key={s.id} value={s.tenCo} className="bg-gray-900">{s.tenCo} — {dinhDangTien(s.gia)}</option>)}
                      </select>
                    ) : (
                      <input className="w-full bg-black/50 border border-[var(--color-dark-border)] rounded-xl p-2.5 text-white focus:outline-none focus:border-[var(--color-gold-500)]" placeholder="Cỡ" value={m.coBanh ?? ''} onChange={(e) => suaMon(i, { coBanh: e.target.value })} />
                    )}
                  </div>

                  <div className="w-24">
                    <p className="text-xs text-gray-500 mb-1">SL</p>
                    <input type="number" min={1} className="w-full bg-black/50 border border-[var(--color-dark-border)] rounded-xl p-2.5 text-white text-center focus:outline-none focus:border-[var(--color-gold-500)]" value={m.soLuong}
                      onChange={(e) => suaMon(i, { soLuong: Number(e.target.value) })} />
                  </div>

                  <div className="w-36">
                    <p className="text-xs text-gray-500 mb-1">Đơn giá</p>
                    <input type="number" min={0} step={1000} className="w-full bg-black/50 border border-[var(--color-dark-border)] rounded-xl p-2.5 text-white focus:outline-none focus:border-[var(--color-gold-500)]" value={m.gia}
                      onChange={(e) => suaMon(i, { gia: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="bg-[var(--color-gold-500)]/10 border border-[var(--color-gold-500)]/30 rounded-xl p-3 text-[var(--color-gold-100)] placeholder-[var(--color-gold-500)]/50 focus:outline-none focus:border-[var(--color-gold-400)] transition-colors" placeholder="✍️ Chữ viết lên bánh"
                    value={m.chuViet ?? ''} onChange={(e) => suaMon(i, { chuViet: e.target.value })} />
                  <input className="bg-black/50 border border-[var(--color-dark-border)] rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-gold-500)] transition-colors" placeholder="📝 Ghi chú món (ít ngọt, đổi hoa...)"
                    value={m.ghiChu ?? ''} onChange={(e) => suaMon(i, { ghiChu: e.target.value })} />
                </div>

                <div className="flex gap-2 items-center flex-wrap pt-2">
                  <span className="text-sm text-gray-500 mr-2">Ảnh mẫu:</span>
                  {m.anhMau.map((f) => <img key={f} src={`/api/uploads/${f}`} alt="" className="h-16 w-16 object-cover rounded-lg border border-white/10 shadow-lg" />)}
                  <label className="border-2 border-dashed border-[var(--color-dark-border)] hover:border-[var(--color-gold-500)] rounded-lg h-16 w-16 flex items-center justify-center cursor-pointer text-gray-400 hover:text-[var(--color-gold-400)] transition-colors bg-black/20">
                    <span className="text-xl">📷</span>
                    <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && themAnh(i, e.target.files[0])} />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Giao nhận */}
      <section className="glass-panel p-6 space-y-4">
        <h3 className="text-[var(--color-gold-500)] text-sm font-semibold uppercase tracking-wider border-b border-white/10 pb-2 mb-4">Giao hàng & Nhận bánh</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
             <label className="block text-gray-300 font-medium mb-2">🕐 Ngày giờ khách lấy bánh *</label>
             <div className="flex gap-2">
               <input required type="datetime-local" className="bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-3 flex-1 text-white focus:outline-none focus:border-[var(--color-gold-500)] css-dark-calendar"
                 value={toLocalInput(v.ngayGioNhan)} onChange={(e) => setV({ ...v, ngayGioNhan: new Date(e.target.value).getTime() })} />
               <button type="button" className="border border-[var(--color-dark-border)] bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 transition-colors font-medium whitespace-nowrap" onClick={() => setV({ ...v, ngayGioNhan: Date.now() })}>Lấy ngay</button>
             </div>
          </div>
          
          <div>
            <label className="block text-gray-300 font-medium mb-2">Hình thức nhận</label>
            <div className="flex gap-2">
              {NHAN.map(([gt, ten]) => (
                <button type="button" key={gt} onClick={() => setV({ ...v, hinhThucNhan: gt })}
                  className={`px-4 py-3 flex-1 rounded-xl border transition-colors ${v.hinhThucNhan === gt ? 'bg-[var(--color-gold-500)] text-black font-semibold border-[var(--color-gold-500)] shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-[var(--color-dark-border)] text-gray-300 hover:bg-white/10'}`}>{ten}</button>
              ))}
            </div>
          </div>
        </div>

        {v.hinhThucNhan === 'ship' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-black/20 p-4 rounded-xl border border-[var(--color-dark-border)]">
            <input required className="bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] md:col-span-2" placeholder="Địa chỉ ship chi tiết *"
              value={v.diaChiShip ?? ''} onChange={(e) => setV({ ...v, diaChiShip: e.target.value })} />
            <input className="bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-3 text-white focus:outline-none focus:border-[var(--color-gold-500)]" placeholder="SĐT người nhận (nếu khác)"
              value={v.sdtNguoiNhan ?? ''} onChange={(e) => setV({ ...v, sdtNguoiNhan: e.target.value })} />
            <div className="flex items-center gap-3">
              <span className="text-gray-400 whitespace-nowrap px-2">Phí ship</span>
              <input type="number" min={0} step={1000} className="bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] flex-1 text-right"
                value={v.phiShip} onChange={(e) => setV({ ...v, phiShip: Number(e.target.value) })} />
            </div>
          </div>
        )}
        
        <div className="pt-2">
          <textarea className="w-full bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-gold-500)] min-h-[100px]" placeholder="Ghi chú chung của đơn hàng..."
            value={v.ghiChu ?? ''} onChange={(e) => setV({ ...v, ghiChu: e.target.value })} />
        </div>
      </section>

      {/* Tiền */}
      <section className="glass-panel p-6 space-y-6">
        <h3 className="text-[var(--color-gold-500)] text-sm font-semibold uppercase tracking-wider border-b border-white/10 pb-2 mb-4">Thanh toán</h3>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/30 p-4 rounded-xl border border-[var(--color-dark-border)]">
          <div className="flex items-center gap-4 text-xl">
            <span className="text-gray-300 font-medium">Tổng thanh toán:</span>
            {ghiDeTien
              ? <input type="number" min={0} step={1000} className="bg-black/50 border border-[var(--color-gold-500)]/50 rounded-xl p-2 w-48 text-[var(--color-gold-400)] font-bold text-right shadow-[0_0_15px_rgba(234,179,8,0.1)] focus:outline-none"
                  value={tongTien} onChange={(e) => setV({ ...v, tongTienGhiDe: Number(e.target.value) })} />
              : <span className="font-bold text-[var(--color-gold-400)] text-2xl tracking-wide">{dinhDangTien(tongTinh)}</span>}
          </div>
          
          <label className="text-sm text-gray-400 flex items-center gap-2 cursor-pointer hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-lg">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-black/50 accent-[var(--color-gold-500)]" checked={ghiDeTien}
              onChange={(e) => { setGhiDeTien(e.target.checked); if (e.target.checked) setV((x) => ({ ...x, tongTienGhiDe: tongTinh })) }} />
            Cho phép sửa giá thủ công (VD: Giảm giá)
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end pt-2">
          <div className="md:col-span-4">
            <label className="block text-gray-400 text-sm mb-2">Đã đặt cọc</label>
            <input type="number" min={0} step={1000} className="w-full bg-black/40 border border-[var(--color-dark-border)] rounded-xl p-3.5 text-white text-lg focus:outline-none focus:border-[var(--color-gold-500)]"
              value={v.tienCoc} onChange={(e) => setV({ ...v, tienCoc: Number(e.target.value) })} />
          </div>
          
          <div className="md:col-span-8 flex flex-col items-end w-full">
             <div className="mb-3 text-right">
               <span className="text-gray-400 text-lg mr-3">Còn lại:</span>
               <span className="font-bold text-2xl text-[var(--color-gold-400)]">{dinhDangTien(tinhConLai(tongTien, v.tienCoc))}</span>
             </div>
             
             <div className="flex gap-2 w-full justify-end">
               {TT.map(([gt, ten]) => (
                 <button type="button" key={gt} onClick={() => setV({ ...v, hinhThucTt: gt })}
                   className={`px-4 py-3 rounded-xl border text-sm transition-colors ${v.hinhThucTt === gt ? 'bg-white/20 text-white font-medium border-white/40' : 'bg-transparent text-gray-400 border-[var(--color-dark-border)] hover:bg-white/5'}`}>{ten}</button>
               ))}
             </div>
          </div>
        </div>
      </section>

      {loi && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl font-medium text-center">{loi}</div>}
      
      <div className="sticky bottom-6 z-50 mt-8">
        <button disabled={dangLuu || v.items.length === 0}
          className="w-full btn-primary py-4 text-xl tracking-wide disabled:opacity-40 shadow-[0_10px_30px_rgba(234,179,8,0.2)]">
          {dangLuu ? 'Đang lưu…' : donCu ? '💾 Lưu thay đổi' : '✅ Đặt Hàng Mới'}
        </button>
      </div>
    </form>
  )
}
