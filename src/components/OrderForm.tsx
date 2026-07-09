'use client'
import { useEffect, useMemo, useState } from 'react'
import { tinhTongTien, tinhConLai } from '@/lib/money'
import { dinhDangTien } from '@/lib/time'
import { laSdtVN } from '@/lib/phone'

type Opt = { id: number; loai: string; ten: string; thuTu: number; active: number }
type BanhOptions = { cot: Opt[]; mut: Opt[]; topping: Opt[]; size: Opt[]; sanPhamMau: { id: number; ten: string } | null }
type MonNhap = {
  productId?: number; tenMon: string; coBanh?: string
  cot?: string; mut?: string; topping?: string[]
  soLuong: number; chuViet?: string; ghiChu?: string; gia: number; anhMau: string[]
}

export type GiaTriForm = {
  khach: { sdt: string; ten: string }
  nguon: string; ngayGioNhan: number; hinhThucNhan: string
  diaChiShip?: string; sdtNguoiNhan?: string; tenNguoiNhan?: string; phiShip: number
  kieuPhiShip?: 'freeship' | 'theo_app'
  tienCoc: number; hinhThucTt: string; ghiChu?: string; tongTienGhiDe?: number
  items: MonNhap[]
}

const NGUON = [['tai_quay', 'Tại quầy'], ['zalo', 'Zalo'], ['messenger', 'Messenger'], ['dien_thoai', 'Điện thoại'], ['khac', 'Khác']]
const NHAN = [['tai_tiem', 'Nhận tại tiệm'], ['ship', 'Ship']]
const TT = [['chua_tt', 'Chưa thanh toán'], ['tien_mat', 'Tiền mặt'], ['chuyen_khoan', 'Chuyển khoản']]
const NGUON_TEN: Record<string, string> = Object.fromEntries(NGUON)
const NHAN_TEN: Record<string, string> = Object.fromEntries(NHAN)
const TT_TEN: Record<string, string> = Object.fromEntries(TT)
const PHUT = ['00', '15', '30', '45']

const TEN_MAU_MAC_DINH = 'Bánh kem sinh nhật theo mẫu'

// Tách timestamp ms thành ngày (YYYY-MM-DD), giờ (0–23), phút (0/15/30/45)
function tachNgayGio(ms: number) {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  const gio = d.getHours()
  const phutRaw = d.getMinutes()
  const phut = PHUT.reduce((best, cur) => (Math.abs(Number(cur) - phutRaw) < Math.abs(Number(best) - phutRaw) ? cur : best), '00')
  return { ngay: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, gio, phut }
}

// Gộp ngày + giờ + phút thành timestamp ms
function gopNgayGio(ngay: string, gio: number, phut: string): number {
  const [y, m, d] = ngay.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, gio, Number(phut), 0, 0).getTime()
}

// Ô nhập tiền theo "nghìn đồng": gõ 235 → hiển thị "235" kèm đuôi cố định ".000đ" (giá trị lưu = 235000)
function NhapNghin({ giaTri, onDoi, placeholder, className }: {
  giaTri: number; onDoi: (v: number) => void; placeholder?: string; className?: string
}) {
  const nghin = giaTri ? Math.round(giaTri / 1000) : null
  const hienThi = nghin == null ? '' : nghin.toLocaleString('vi-VN')
  return (
    <div className={`relative ${className ?? ''}`}>
      <input inputMode="numeric" placeholder={placeholder} className="tb-input num w-full pr-14"
        value={hienThi} onChange={(e) => onDoi((Number(e.target.value.replace(/\D/g, '')) || 0) * 1000)} />
      {giaTri > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-xam)] text-sm num pointer-events-none">.000đ</span>
      )}
    </div>
  )
}

export default function OrderForm({ donCu, onLuu, dangLuu, loi }: {
  donCu?: GiaTriForm; onLuu: (v: GiaTriForm) => void; dangLuu: boolean; loi?: string
}) {
  const [opts, setOpts] = useState<BanhOptions>({ cot: [], mut: [], topping: [], size: [], sanPhamMau: null })
  const [v, setV] = useState<GiaTriForm>(donCu ?? {
    khach: { sdt: '', ten: '' }, nguon: 'tai_quay',
    ngayGioNhan: Date.now() + 30 * 60000, hinhThucNhan: 'tai_tiem',
    phiShip: 0, kieuPhiShip: 'freeship', tienCoc: 0, hinhThucTt: 'chua_tt', items: [],
  })
  const [ghiDeTien, setGhiDeTien] = useState(donCu?.tongTienGhiDe != null)
  const [xacNhan, setXacNhan] = useState(false)
  const [phongTo, setPhongTo] = useState<string | null>(null)

  const init0 = tachNgayGio(v.ngayGioNhan)
  const [ngay, setNgay] = useState(init0.ngay)
  const [gio, setGio] = useState(init0.gio)
  const [phut, setPhut] = useState(init0.phut)

  useEffect(() => {
    fetch('/api/banh-options').then((r) => r.json()).then((d: BanhOptions) => setOpts({
      cot: (d.cot ?? []).filter((o) => o.active === 1),
      mut: (d.mut ?? []).filter((o) => o.active === 1),
      topping: (d.topping ?? []).filter((o) => o.active === 1),
      size: (d.size ?? []).filter((o) => o.active === 1),
      sanPhamMau: d.sanPhamMau ?? null,
    }))
  }, [])

  // Đồng bộ 3 control ngày/giờ/phút vào ngayGioNhan
  useEffect(() => {
    setV((x) => ({ ...x, ngayGioNhan: gopNgayGio(ngay, gio, phut) }))
  }, [ngay, gio, phut])

  const tenMau = opts.sanPhamMau?.ten ?? TEN_MAU_MAC_DINH

  // autocomplete khách quen theo SĐT
  async function traSdt(sdt: string) {
    setV((x) => ({ ...x, khach: { ...x.khach, sdt } }))
    if (sdt.length >= 9) {
      const khach = await fetch(`/api/customers?sdt=${sdt}`).then((r) => r.json())
      if (khach) setV((x) => ({ ...x, khach: { sdt, ten: khach.ten } }))
    }
  }

  function themBanh() {
    setV((x) => ({
      ...x,
      items: [...x.items, {
        productId: opts.sanPhamMau?.id, tenMon: tenMau,
        coBanh: opts.size[0]?.ten, cot: '', mut: '', topping: [],
        soLuong: 1, gia: 0, anhMau: [],
      }],
    }))
  }

  function suaMon(i: number, patch: Partial<MonNhap>) {
    setV((x) => ({ ...x, items: x.items.map((m, j) => (j === i ? { ...m, ...patch } : m)) }))
  }

  function toggleTopping(i: number, ten: string) {
    setV((x) => ({
      ...x,
      items: x.items.map((m, j) => {
        if (j !== i) return m
        const cur = m.topping ?? []
        return { ...m, topping: cur.includes(ten) ? cur.filter((t) => t !== ten) : [...cur, ten] }
      }),
    }))
  }

  async function themAnh(i: number, file: File) {
    if (v.items[i].anhMau.length >= 5) { alert('Mỗi bánh chỉ tải tối đa 5 ảnh mẫu.'); return }
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { alert(`Tải ảnh thất bại: ${data.error}`); return }
    suaMon(i, { anhMau: [...v.items[i].anhMau, data.filePath] })
  }

  const tongTinh = tinhTongTien(v.items, v.phiShip)
  const tongTien = ghiDeTien && v.tongTienGhiDe != null ? v.tongTienGhiDe : tongTinh

  const sdtKhachSai = v.khach.sdt.length > 0 && !laSdtVN(v.khach.sdt)
  const sdtNhanSai = !!v.sdtNguoiNhan && v.sdtNguoiNhan.length > 0 && !laSdtVN(v.sdtNguoiNhan)

  const hopLe = useMemo(() => {
    if (v.items.length === 0) return false
    if (!laSdtVN(v.khach.sdt) || !v.khach.ten.trim()) return false
    for (const m of v.items) {
      if (!m.cot) return false
      if (!m.coBanh) return false
      if (!m.gia || m.gia <= 0) return false
    }
    if (v.hinhThucNhan === 'ship') {
      if (!v.diaChiShip?.trim()) return false
      if (v.sdtNguoiNhan && !laSdtVN(v.sdtNguoiNhan)) return false
    }
    return true
  }, [v])

  function moXacNhan() {
    if (!hopLe) return
    setXacNhan(true)
  }

  function xacNhanLuu() {
    onLuu({ ...v, tongTienGhiDe: ghiDeTien ? tongTien : undefined })
  }

  // Nút toggle chung
  const clsToggle = (active: boolean) =>
    `px-4 py-2 rounded-xl border transition-colors ${active
      ? 'bg-[var(--color-caramel)] text-white font-semibold border-[var(--color-caramel)]'
      : 'bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-caphe)] hover:bg-[#D3EFEC]'}`

  return (
    <>
      <form className="max-w-4xl mx-auto space-y-6 pb-20" onSubmit={(e) => { e.preventDefault(); moXacNhan() }}>

        {/* Khách + Nguồn */}
        <section className="tb-card p-6 space-y-4">
          <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider border-b border-[var(--color-line)] pb-2 mb-4 font-display">Thông tin Khách hàng</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input required className="tb-input" placeholder="Số điện thoại *" inputMode="tel"
                value={v.khach.sdt} onChange={(e) => traSdt(e.target.value)} />
              {sdtKhachSai && <p className="text-[var(--color-dau-600)] text-sm mt-1">Số điện thoại không hợp lệ (di động VN).</p>}
            </div>
            <input required className="tb-input" placeholder="Tên khách hàng *"
              value={v.khach.ten} onChange={(e) => setV({ ...v, khach: { ...v.khach, ten: e.target.value } })} />
          </div>

          <div className="pt-2">
            <p className="text-sm text-[var(--color-xam)] mb-2">Nguồn đơn:</p>
            <div className="flex gap-2 flex-wrap">
              {NGUON.map(([gt, ten]) => (
                <button type="button" key={gt} onClick={() => setV({ ...v, nguon: gt })} className={clsToggle(v.nguon === gt)}>{ten}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Bánh kem theo mẫu */}
        <section className="tb-card p-6 space-y-5">
          <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider border-b border-[var(--color-line)] pb-2 mb-4 flex justify-between items-center font-display">
            <span>{tenMau}</span>
            <span className="text-[var(--color-xam)] text-xs font-normal bg-[var(--color-surface-2)] px-2 py-1 rounded">{v.items.length} bánh</span>
          </h3>

          <div className="space-y-4">
            {v.items.map((m, i) => (
              <div key={i} className="bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-2xl p-5 space-y-4 relative group">
                <button type="button" onClick={() => setV((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}
                  className="absolute top-4 right-4 text-[var(--color-xam)] hover:text-[var(--color-dau)] font-bold px-2 py-1 bg-[var(--color-surface)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">✕</button>

                <div className="text-[var(--color-caramel-600)] font-semibold font-display pt-2 md:pt-0">🎂 Bánh #{i + 1} — {tenMau}</div>

                {/* Cốt */}
                <div>
                  <p className="text-xs text-[var(--color-xam)] mb-1">Cốt bánh *</p>
                  <div className="flex gap-2 flex-wrap">
                    {opts.cot.map((o) => (
                      <button type="button" key={o.id} onClick={() => suaMon(i, { cot: o.ten })} className={clsToggle(m.cot === o.ten)}>{o.ten}</button>
                    ))}
                  </div>
                  {!m.cot && <p className="text-[var(--color-dau-600)] text-sm mt-1">Vui lòng chọn cốt bánh.</p>}
                </div>

                {/* Mứt */}
                <div>
                  <p className="text-xs text-[var(--color-xam)] mb-1">Mứt</p>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={() => suaMon(i, { mut: '' })} className={clsToggle(!m.mut)}>Không</button>
                    {opts.mut.map((o) => (
                      <button type="button" key={o.id} onClick={() => suaMon(i, { mut: o.ten })} className={clsToggle(m.mut === o.ten)}>{o.ten}</button>
                    ))}
                  </div>
                </div>

                {/* Topping (nhiều) */}
                <div>
                  <p className="text-xs text-[var(--color-xam)] mb-1">Topping (chọn nhiều)</p>
                  <div className="flex gap-2 flex-wrap">
                    {opts.topping.map((o) => (
                      <button type="button" key={o.id} onClick={() => toggleTopping(i, o.ten)} className={clsToggle((m.topping ?? []).includes(o.ten))}>{o.ten}</button>
                    ))}
                    {opts.topping.length === 0 && <span className="text-[var(--color-xam)] text-sm">Chưa có topping.</span>}
                  </div>
                </div>

                {/* Size + SL + Giá */}
                <div className="flex gap-3 flex-wrap items-start">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-xs text-[var(--color-xam)] mb-1">Size *</p>
                    <div className="flex gap-2 flex-wrap">
                      {opts.size.map((o) => (
                        <button type="button" key={o.id} onClick={() => suaMon(i, { coBanh: o.ten })} className={clsToggle(m.coBanh === o.ten)}>{o.ten}</button>
                      ))}
                    </div>
                    {!m.coBanh && <p className="text-[var(--color-dau-600)] text-sm mt-1">Vui lòng chọn size.</p>}
                  </div>

                  <div className="w-24">
                    <p className="text-xs text-[var(--color-xam)] mb-1">SL</p>
                    <input type="number" min={1} className="tb-input num text-center" value={m.soLuong}
                      onChange={(e) => suaMon(i, { soLuong: Math.max(1, Number(e.target.value)) })} />
                  </div>

                  <div className="w-40">
                    <p className="text-xs text-[var(--color-xam)] mb-1">Đơn giá *</p>
                    <NhapNghin giaTri={m.gia} onDoi={(g) => suaMon(i, { gia: g })} placeholder="vd 200" />
                    {(!m.gia || m.gia <= 0) && <p className="text-[var(--color-dau-600)] text-sm mt-1">Vui lòng nhập giá.</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="w-full rounded-xl p-3 text-[var(--color-caphe)] focus:outline-none transition-colors" style={{ background: 'rgba(240,107,163,.08)', border: '1px solid rgba(240,107,163,.35)' }} placeholder="✍️ Nội dung chữ và vị trí chữ"
                    value={m.chuViet ?? ''} onChange={(e) => suaMon(i, { chuViet: e.target.value })} />
                  <input className="tb-input" placeholder="📝 Ghi chú khác (ít ngọt, đổi hoa...)"
                    value={m.ghiChu ?? ''} onChange={(e) => suaMon(i, { ghiChu: e.target.value })} />
                </div>

                <div className="flex gap-2 items-center flex-wrap pt-2">
                  <span className="text-sm text-[var(--color-xam)] mr-2">Ảnh mẫu ({m.anhMau.length}/5):</span>
                  {m.anhMau.map((f) => (
                    <span key={f} className="relative">
                      <img src={`/api/uploads/${f}`} alt="" className="h-16 w-16 object-cover rounded-lg border border-[var(--color-line)]" />
                      <button type="button" onClick={() => suaMon(i, { anhMau: m.anhMau.filter((x) => x !== f) })}
                        className="absolute -top-1.5 -right-1.5 bg-[var(--color-dau)] text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center">✕</button>
                    </span>
                  ))}
                  {m.anhMau.length < 5 && (
                    <label className="border-2 border-dashed border-[var(--color-line)] hover:border-[var(--color-caramel)] rounded-lg h-16 w-16 flex items-center justify-center cursor-pointer text-[var(--color-xam)] hover:text-[var(--color-caramel-600)] transition-colors bg-[var(--color-surface)]">
                      <span className="text-xl">📷</span>
                      <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && themAnh(i, e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={themBanh} className="tb-btn-ghost w-full py-3 border-dashed">＋ Thêm bánh</button>
        </section>

        {/* Giao nhận */}
        <section className="tb-card p-6 space-y-4">
          <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider border-b border-[var(--color-line)] pb-2 mb-4 font-display">Giao hàng & Nhận bánh</h3>

          <div>
            <label className="block text-[var(--color-caphe)] font-medium mb-2">🕐 Ngày giờ khách lấy bánh *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="date" className="tb-input"
                value={ngay} onChange={(e) => setNgay(e.target.value)} />
              <div className="flex items-center gap-3">
                <span className="num text-2xl text-[var(--color-caramel-600)] w-28 text-center bg-[var(--color-surface-2)] rounded-xl py-2 border border-[var(--color-line)]">
                  {String(gio).padStart(2, '0')}:{phut}
                </span>
                <button type="button" className="tb-btn-ghost whitespace-nowrap" onClick={() => {
                  const now = tachNgayGio(Date.now())
                  setNgay(now.ngay); setGio(now.gio); setPhut(now.phut)
                }}>Lấy ngay</button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-xs text-[var(--color-xam)] mb-1">Giờ: {String(gio).padStart(2, '0')}</p>
                <input type="range" min={0} max={23} value={gio} onChange={(e) => setGio(Number(e.target.value))}
                  className="w-full accent-[var(--color-caramel)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-xam)] mb-1">Phút</p>
                <select className="tb-input" value={phut} onChange={(e) => setPhut(e.target.value)}>
                  {PHUT.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[var(--color-caphe)] font-medium mb-2">Hình thức nhận</label>
            <div className="flex gap-2">
              {NHAN.map(([gt, ten]) => (
                <button type="button" key={gt} onClick={() => setV({ ...v, hinhThucNhan: gt })}
                  className={`px-4 py-3 flex-1 rounded-xl border transition-colors ${v.hinhThucNhan === gt ? 'bg-[var(--color-caramel)] text-white font-semibold border-[var(--color-caramel)]' : 'bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-caphe)] hover:bg-[#D3EFEC]'}`}>{ten}</button>
              ))}
            </div>
          </div>

          {v.hinhThucNhan === 'ship' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-line)]">
              <p className="md:col-span-2 text-sm text-[var(--color-xam)]">Người nhận có thể khác người đặt:</p>
              <input className="tb-input" placeholder="Tên người nhận"
                value={v.tenNguoiNhan ?? ''} onChange={(e) => setV({ ...v, tenNguoiNhan: e.target.value })} />
              <div>
                <input className="tb-input" placeholder="SĐT người nhận" inputMode="tel"
                  value={v.sdtNguoiNhan ?? ''} onChange={(e) => setV({ ...v, sdtNguoiNhan: e.target.value })} />
                {sdtNhanSai && <p className="text-[var(--color-dau-600)] text-sm mt-1">SĐT người nhận không hợp lệ.</p>}
              </div>
              <input required className="tb-input md:col-span-2" placeholder="Địa chỉ ship chi tiết *"
                value={v.diaChiShip ?? ''} onChange={(e) => setV({ ...v, diaChiShip: e.target.value })} />
              <div className="md:col-span-2">
                <p className="text-sm text-[var(--color-xam)] mb-2">Phí ship (book app ship ngoài):</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => setV({ ...v, kieuPhiShip: 'freeship', phiShip: 0 })}
                    className={clsToggle(v.kieuPhiShip === 'freeship')}>🆓 Freeship</button>
                  <button type="button" onClick={() => setV({ ...v, kieuPhiShip: 'theo_app', phiShip: 0 })}
                    className={clsToggle(v.kieuPhiShip === 'theo_app')}>🛵 Theo app ship</button>
                </div>
                {!v.kieuPhiShip && v.phiShip > 0 && (
                  <p className="text-xs text-[var(--color-xam)] mt-1">Đơn cũ đang lưu phí ship {dinhDangTien(v.phiShip)} — chọn một trong hai lựa chọn trên nếu muốn đổi.</p>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <textarea className="tb-input min-h-[100px]" placeholder="Ghi chú chung của đơn hàng..."
              value={v.ghiChu ?? ''} onChange={(e) => setV({ ...v, ghiChu: e.target.value })} />
          </div>
        </section>

        {/* Tiền */}
        <section className="tb-card p-6 space-y-6">
          <h3 className="text-[var(--color-caramel-600)] text-sm font-semibold uppercase tracking-wider border-b border-[var(--color-line)] pb-2 mb-4 font-display">Thanh toán</h3>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-line)]">
            <div className="flex items-center gap-3 flex-wrap text-xl min-w-0">
              <span className="text-[var(--color-caphe)] font-medium">Tổng thanh toán:</span>
              {ghiDeTien
                ? <NhapNghin giaTri={tongTien} onDoi={(g) => setV({ ...v, tongTienGhiDe: g })} className="w-44" />
                : <span className="num text-[var(--color-caramel-600)] text-2xl tracking-wide break-all">{dinhDangTien(tongTinh)}</span>}
            </div>

            <label className="text-sm text-[var(--color-xam)] flex items-center gap-2 cursor-pointer hover:text-[var(--color-caphe)] transition-colors bg-[var(--color-surface)] px-3 py-2 rounded-lg">
              <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-line)] accent-[var(--color-caramel)]" checked={ghiDeTien}
                onChange={(e) => { setGhiDeTien(e.target.checked); if (e.target.checked) setV((x) => ({ ...x, tongTienGhiDe: tongTinh })) }} />
              Cho phép sửa giá thủ công (VD: Giảm giá)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end pt-2">
            <div className="md:col-span-4">
              <label className="block text-[var(--color-xam)] text-sm mb-2">Đã đặt cọc</label>
              <NhapNghin giaTri={v.tienCoc} onDoi={(g) => setV({ ...v, tienCoc: g })} placeholder="vd 100" />
            </div>

            <div className="md:col-span-8 flex flex-col items-end w-full min-w-0">
              <div className="mb-3 text-right flex items-baseline gap-2 flex-wrap justify-end">
                <span className="text-[var(--color-xam)] text-lg">Còn lại:</span>
                <span className="num text-2xl text-[var(--color-caramel-600)] break-all">{dinhDangTien(tinhConLai(tongTien, v.tienCoc))}</span>
              </div>

              <div className="flex gap-2 w-full justify-end">
                {TT.map(([gt, ten]) => (
                  <button type="button" key={gt} onClick={() => setV({ ...v, hinhThucTt: gt })}
                    className={`px-4 py-3 rounded-xl border text-sm transition-colors ${v.hinhThucTt === gt ? 'bg-[var(--color-caramel)] text-white font-medium border-[var(--color-caramel)]' : 'bg-[var(--color-surface-2)] text-[var(--color-caphe)] border-[var(--color-line)] hover:bg-[#D3EFEC]'}`}>{ten}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {loi && <div className="p-4 rounded-xl font-medium text-center text-[var(--color-dau-600)]" style={{ background: 'rgba(240,107,163,.1)', border: '1px solid rgba(240,107,163,.3)' }}>{loi}</div>}

        <div className="sticky bottom-6 z-50 mt-8">
          <button type="submit" disabled={dangLuu || !hopLe}
            className="w-full btn-primary py-4 text-xl tracking-wide disabled:opacity-40">
            {dangLuu ? 'Đang lưu…' : donCu ? '💾 Xem lại & Lưu' : '✅ Xem lại & Đặt Hàng'}
          </button>
        </div>
      </form>

      {/* BƯỚC XÁC NHẬN */}
      {xacNhan && (
        <div className="fixed inset-0 z-[60] bg-black/50 overflow-y-auto p-4 flex items-start justify-center">
          <div className="tb-card max-w-3xl w-full my-8 p-6 space-y-5">
            <h2 className="font-display text-2xl text-[var(--color-caramel-600)] border-b border-[var(--color-line)] pb-3">Xác nhận đơn hàng</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface-2)] rounded-xl p-4 border border-[var(--color-line)]">
                <p className="text-xs text-[var(--color-xam)] uppercase tracking-wider mb-2">Khách hàng</p>
                <p className="text-[var(--color-caphe)] font-medium">{v.khach.ten}</p>
                <p className="num text-[var(--color-caphe)]">{v.khach.sdt}</p>
                <p className="text-sm text-[var(--color-xam)] mt-1">Nguồn: {NGUON_TEN[v.nguon] ?? v.nguon}</p>
              </div>
              <div className="bg-[var(--color-surface-2)] rounded-xl p-4 border border-[var(--color-line)]">
                <p className="text-xs text-[var(--color-xam)] uppercase tracking-wider mb-2">Giao nhận</p>
                <p className="text-[var(--color-caphe)] num">
                  {new Date(v.ngayGioNhan).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-[var(--color-caphe)] mt-1">{NHAN_TEN[v.hinhThucNhan] ?? v.hinhThucNhan}</p>
                {v.hinhThucNhan === 'ship' && (
                  <div className="text-sm text-[var(--color-xam)] mt-1 space-y-0.5">
                    {v.tenNguoiNhan && <p>Người nhận: {v.tenNguoiNhan}</p>}
                    {v.sdtNguoiNhan && <p className="num">{v.sdtNguoiNhan}</p>}
                    {v.diaChiShip && <p>📍 {v.diaChiShip}</p>}
                    <p>🛵 {v.kieuPhiShip === 'theo_app' ? 'Phí ship: theo app ship' : v.kieuPhiShip === 'freeship' ? 'Freeship' : `Phí ship: ${dinhDangTien(v.phiShip)}`}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bánh */}
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-xam)] uppercase tracking-wider">Chi tiết bánh</p>
              {v.items.map((m, i) => (
                <div key={i} className="bg-[var(--color-surface-2)] rounded-xl p-4 border border-[var(--color-line)] space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <p className="font-medium text-[var(--color-caramel-600)]">🎂 {m.tenMon || tenMau}</p>
                    <p className="num text-[var(--color-caphe)] whitespace-nowrap">{m.soLuong} × {dinhDangTien(m.gia)}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap text-sm">
                    {m.coBanh && <span className="tb-chip tb-chip-caramel">Size {m.coBanh}</span>}
                    {m.cot && <span className="tb-chip">Cốt {m.cot}</span>}
                    {m.mut && <span className="tb-chip tb-chip-dau">Mứt {m.mut}</span>}
                    {(m.topping ?? []).map((t) => <span key={t} className="tb-chip tb-chip-tra">{t}</span>)}
                  </div>
                  {m.chuViet && <p className="text-sm text-[var(--color-caphe)]">✍️ {m.chuViet}</p>}
                  {m.ghiChu && <p className="text-sm text-[var(--color-xam)]">📝 {m.ghiChu}</p>}

                  {m.anhMau.length > 0 && (
                    <div className="flex gap-3 flex-wrap pt-1">
                      {m.anhMau.map((f) => (
                        <div key={f} className="relative">
                          <img src={`/api/uploads/${f}`} alt="Ảnh mẫu" onClick={() => setPhongTo(f)}
                            className="h-40 w-40 object-cover rounded-xl border border-[var(--color-line)] cursor-zoom-in" />
                          <div className="flex gap-2 mt-1">
                            <button type="button" onClick={() => setPhongTo(f)} className="tb-chip tb-chip-caramel cursor-pointer">🔍 Phóng to</button>
                            <a href={`/api/uploads/${f}`} download className="tb-chip cursor-pointer">⬇️ Tải ảnh</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tiền */}
            <div className="bg-[var(--color-surface-2)] rounded-xl p-4 border border-[var(--color-line)] space-y-1">
              <div className="flex justify-between"><span className="text-[var(--color-caphe)]">Tổng tiền</span><span className="num text-[var(--color-caramel-600)] text-lg">{dinhDangTien(tongTien)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-xam)]">Đã cọc</span><span className="num text-[var(--color-caphe)]">{dinhDangTien(v.tienCoc)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-xam)]">Còn lại</span><span className="num text-[var(--color-caphe)]">{dinhDangTien(tinhConLai(tongTien, v.tienCoc))}</span></div>
              <div className="flex justify-between text-sm pt-1"><span className="text-[var(--color-xam)]">Thanh toán</span><span className="text-[var(--color-caphe)]">{TT_TEN[v.hinhThucTt] ?? v.hinhThucTt}</span></div>
            </div>

            {v.ghiChu && (
              <div className="bg-[var(--color-surface-2)] rounded-xl p-4 border border-[var(--color-line)]">
                <p className="text-xs text-[var(--color-xam)] uppercase tracking-wider mb-1">Ghi chú đơn</p>
                <p className="text-sm text-[var(--color-caphe)]">{v.ghiChu}</p>
              </div>
            )}

            {loi && <div className="p-3 rounded-xl text-center text-[var(--color-dau-600)]" style={{ background: 'rgba(240,107,163,.1)', border: '1px solid rgba(240,107,163,.3)' }}>{loi}</div>}

            <div className="flex gap-3 pt-2">
              <button type="button" className="tb-btn-ghost flex-1 py-3" onClick={() => setXacNhan(false)} disabled={dangLuu}>← Quay lại sửa</button>
              <button type="button" className="btn-primary flex-1 py-3" onClick={xacNhanLuu} disabled={dangLuu}>
                {dangLuu ? 'Đang lưu…' : donCu ? '💾 Xác nhận lưu' : '✅ Xác nhận tạo đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {phongTo && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4" onClick={() => setPhongTo(null)}>
          <img src={`/api/uploads/${phongTo}`} alt="Ảnh mẫu" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <div className="absolute top-4 right-4 flex gap-2">
            <a href={`/api/uploads/${phongTo}`} download onClick={(e) => e.stopPropagation()} className="btn-primary px-4 py-2">⬇️ Tải ảnh</a>
            <button type="button" onClick={() => setPhongTo(null)} className="tb-btn-ghost px-4 py-2 bg-white">✕ Đóng</button>
          </div>
        </div>
      )}
    </>
  )
}
