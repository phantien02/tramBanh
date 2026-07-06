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
    <form className="max-w-3xl mx-auto space-y-4" onSubmit={(e) => { e.preventDefault(); onLuu({ ...v, tongTienGhiDe: ghiDeTien ? tongTien : undefined }) }}>
      {/* Khách + nguồn */}
      <section className="bg-white rounded-xl p-4 grid grid-cols-2 gap-3">
        <input required className="border rounded-lg p-3" placeholder="SĐT khách *" inputMode="tel"
          value={v.khach.sdt} onChange={(e) => traSdt(e.target.value)} />
        <input required className="border rounded-lg p-3" placeholder="Tên khách *"
          value={v.khach.ten} onChange={(e) => setV({ ...v, khach: { ...v.khach, ten: e.target.value } })} />
        <div className="col-span-2 flex gap-2 flex-wrap">
          {NGUON.map(([gt, ten]) => (
            <button type="button" key={gt} onClick={() => setV({ ...v, nguon: gt })}
              className={`px-3 py-2 rounded-lg border ${v.nguon === gt ? 'bg-pink-600 text-white border-pink-600' : 'bg-white'}`}>{ten}</button>
          ))}
        </div>
      </section>

      {/* Chọn bánh */}
      <section className="bg-white rounded-xl p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sanPham.map((p) => (
            <button type="button" key={p.id} onClick={() => themMon(p)}
              className="shrink-0 border rounded-xl p-2 w-28 hover:border-pink-500 text-center">
              {p.anh ? <img src={`/api/uploads/${p.anh}`} alt="" className="h-16 w-full object-cover rounded" /> : <div className="h-16 bg-pink-50 rounded flex items-center justify-center text-2xl">🎂</div>}
              <div className="text-xs mt-1 font-medium leading-tight">{p.ten}</div>
            </button>
          ))}
          <button type="button" onClick={() => setV((x) => ({ ...x, items: [...x.items, { tenMon: '', soLuong: 1, gia: 0, anhMau: [] }] }))}
            className="shrink-0 border-2 border-dashed rounded-xl p-2 w-28 text-center text-gray-500 hover:border-pink-500">
            <div className="h-16 flex items-center justify-center text-2xl">＋</div>
            <div className="text-xs mt-1">Bánh đặt riêng</div>
          </button>
        </div>

        {v.items.map((m, i) => {
          const p = sanPham.find((s) => s.id === m.productId)
          return (
            <div key={i} className="border rounded-xl p-3 space-y-2 relative">
              <button type="button" onClick={() => setV((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}
                className="absolute top-2 right-2 text-red-500 font-bold px-2">✕</button>
              <div className="flex gap-2 flex-wrap items-center">
                <input required className="border rounded-lg p-2 flex-1 min-w-40 font-medium" placeholder="Tên bánh *"
                  value={m.tenMon} onChange={(e) => suaMon(i, { tenMon: e.target.value })} />
                {p ? (
                  <select className="border rounded-lg p-2" value={m.coBanh}
                    onChange={(e) => {
                      const size = p.sizes.find((s) => s.tenCo === e.target.value)
                      suaMon(i, { coBanh: e.target.value, gia: size?.gia ?? m.gia })
                    }}>
                    {p.sizes.map((s) => <option key={s.id} value={s.tenCo}>{s.tenCo} — {dinhDangTien(s.gia)}</option>)}
                  </select>
                ) : (
                  <input className="border rounded-lg p-2 w-24" placeholder="Cỡ" value={m.coBanh ?? ''} onChange={(e) => suaMon(i, { coBanh: e.target.value })} />
                )}
                <input type="number" min={1} className="border rounded-lg p-2 w-20" value={m.soLuong}
                  onChange={(e) => suaMon(i, { soLuong: Number(e.target.value) })} />
                <input type="number" min={0} step={1000} className="border rounded-lg p-2 w-32" value={m.gia}
                  onChange={(e) => suaMon(i, { gia: Number(e.target.value) })} />
              </div>
              <input className="border rounded-lg p-2 w-full bg-pink-50" placeholder="✍️ Chữ viết lên bánh"
                value={m.chuViet ?? ''} onChange={(e) => suaMon(i, { chuViet: e.target.value })} />
              <input className="border rounded-lg p-2 w-full" placeholder="Ghi chú món (ít ngọt, đổi màu hoa…)"
                value={m.ghiChu ?? ''} onChange={(e) => suaMon(i, { ghiChu: e.target.value })} />
              <div className="flex gap-2 items-center flex-wrap">
                {m.anhMau.map((f) => <img key={f} src={`/api/uploads/${f}`} alt="" className="h-14 w-14 object-cover rounded" />)}
                <label className="border-2 border-dashed rounded-lg h-14 w-14 flex items-center justify-center cursor-pointer text-gray-400">
                  📷<input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && themAnh(i, e.target.files[0])} />
                </label>
              </div>
            </div>
          )
        })}
      </section>

      {/* Giờ nhận + giao nhận */}
      <section className="bg-white rounded-xl p-4 grid grid-cols-2 gap-3">
        <label className="col-span-2 font-medium">🕐 Ngày giờ khách nhận *
          <div className="flex gap-2 mt-1">
            <input required type="datetime-local" className="border rounded-lg p-3 flex-1"
              value={toLocalInput(v.ngayGioNhan)} onChange={(e) => setV({ ...v, ngayGioNhan: new Date(e.target.value).getTime() })} />
            <button type="button" className="border rounded-lg px-3" onClick={() => setV({ ...v, ngayGioNhan: Date.now() })}>Lấy ngay</button>
          </div>
        </label>
        <div className="col-span-2 flex gap-2">
          {NHAN.map(([gt, ten]) => (
            <button type="button" key={gt} onClick={() => setV({ ...v, hinhThucNhan: gt })}
              className={`px-3 py-2 rounded-lg border ${v.hinhThucNhan === gt ? 'bg-pink-600 text-white border-pink-600' : 'bg-white'}`}>{ten}</button>
          ))}
        </div>
        {v.hinhThucNhan === 'ship' && (<>
          <input required className="border rounded-lg p-3" placeholder="Địa chỉ ship *"
            value={v.diaChiShip ?? ''} onChange={(e) => setV({ ...v, diaChiShip: e.target.value })} />
          <input className="border rounded-lg p-3" placeholder="SĐT người nhận (nếu khác)"
            value={v.sdtNguoiNhan ?? ''} onChange={(e) => setV({ ...v, sdtNguoiNhan: e.target.value })} />
          <label className="text-sm">Phí ship
            <input type="number" min={0} step={1000} className="border rounded-lg p-3 w-full"
              value={v.phiShip} onChange={(e) => setV({ ...v, phiShip: Number(e.target.value) })} />
          </label>
        </>)}
        <textarea className="col-span-2 border rounded-lg p-3" placeholder="Ghi chú chung của đơn"
          value={v.ghiChu ?? ''} onChange={(e) => setV({ ...v, ghiChu: e.target.value })} />
      </section>

      {/* Tiền */}
      <section className="bg-white rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-3 text-lg">
          <span className="font-medium">Tổng tiền:</span>
          {ghiDeTien
            ? <input type="number" min={0} step={1000} className="border rounded-lg p-2 w-40 font-bold"
                value={tongTien} onChange={(e) => setV({ ...v, tongTienGhiDe: Number(e.target.value) })} />
            : <span className="font-bold">{dinhDangTien(tongTinh)}</span>}
          <label className="text-sm text-gray-500 ml-auto flex items-center gap-1">
            <input type="checkbox" checked={ghiDeTien}
              onChange={(e) => { setGhiDeTien(e.target.checked); if (e.target.checked) setV((x) => ({ ...x, tongTienGhiDe: tongTinh })) }} />
            Sửa tay (giảm giá…)
          </label>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label>Cọc: <input type="number" min={0} step={1000} className="border rounded-lg p-2 w-32"
            value={v.tienCoc} onChange={(e) => setV({ ...v, tienCoc: Number(e.target.value) })} /></label>
          <span className="font-semibold text-pink-700">Còn lại: {dinhDangTien(tinhConLai(tongTien, v.tienCoc))}</span>
          <div className="flex gap-2 ml-auto">
            {TT.map(([gt, ten]) => (
              <button type="button" key={gt} onClick={() => setV({ ...v, hinhThucTt: gt })}
                className={`px-3 py-1.5 rounded-lg border text-sm ${v.hinhThucTt === gt ? 'bg-gray-800 text-white' : 'bg-white'}`}>{ten}</button>
            ))}
          </div>
        </div>
      </section>

      {loi && <p className="text-red-600 font-medium">{loi}</p>}
      <button disabled={dangLuu || v.items.length === 0}
        className="w-full bg-pink-600 text-white rounded-xl p-4 text-xl font-bold disabled:opacity-40">
        {dangLuu ? 'Đang lưu…' : donCu ? '💾 Lưu thay đổi' : '✅ Tạo đơn'}
      </button>
    </form>
  )
}
