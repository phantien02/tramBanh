'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import OrderDetail from '@/components/OrderDetail'
import { dinhDangTien, dauCuoiNgay } from '@/lib/time'
import { TEN_TRANG_THAI, type TrangThai } from '@/lib/status'
import type { SessionUser } from '@/lib/session'
import type { DonHienThi } from '@/components/OrderCard'

type DonDayDu = DonHienThi & { tongTien: number; tienCoc: number; ngayGioNhan: number }

function toDateInput(ms: number) { return new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) }

export default function TatCaDonPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [tu, setTu] = useState(() => toDateInput(Date.now() - 6 * 86400000))
  const [den, setDen] = useState(() => toDateInput(Date.now()))
  const [trangThai, setTrangThai] = useState('')
  const [q, setQ] = useState('')
  const [dons, setDons] = useState<DonDayDu[]>([])
  const [xem, setXem] = useState<number | null>(null)

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])

  const tai = useCallback(async () => {
    const tuMs = dauCuoiNgay(new Date(tu + 'T00:00')).dau
    const denMs = dauCuoiNgay(new Date(den + 'T00:00')).cuoi
    const url = `/api/orders?tu=${tuMs}&den=${denMs}${trangThai ? `&trangThai=${trangThai}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    setDons((await fetch(url).then((r) => r.json())).orders)
  }, [tu, den, trangThai, q])
  useEffect(() => { tai() }, [tai])

  async function xuatExcel() {
    const XLSX = await import('xlsx') // nạp động — không phình bundle trang
    const rows = dons.map((d) => ({
      'Mã đơn': d.maDon,
      'Ngày giờ nhận': new Date(d.ngayGioNhan).toLocaleString('vi-VN'),
      'Khách': d.khach?.ten ?? '',
      'SĐT': d.khach?.sdt ?? '',
      'Nguồn': d.nguon,
      'Trạng thái': TEN_TRANG_THAI[d.trangThai as TrangThai],
      'Món': d.items.map((i) => `${i.soLuong}x ${i.tenMon}`).join(', '),
      'Tổng tiền': d.tongTien,
      'Cọc': d.tienCoc,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng')
    XLSX.writeFile(wb, `don-hang-${tu}-den-${den}.xlsx`)
  }

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Tất cả đơn">
      <div className="tb-card p-3 mb-4 space-y-3">
        {/* Hàng 1: mốc nhanh + xuất Excel (nút xuất ẩn trên điện thoại) */}
        <div className="flex gap-2 flex-wrap items-center">
          {([['Hôm nay', 0], ['7 ngày', 6], ['30 ngày', 29]] as const).map(([ten, n]) => (
            <button key={ten} className="tb-btn-ghost text-sm px-3 py-1.5"
              onClick={() => { setTu(toDateInput(Date.now() - n * 86400000)); setDen(toDateInput(Date.now())) }}>{ten}</button>
          ))}
          <button onClick={xuatExcel} className="btn-primary hidden sm:inline-block ml-auto">⬇ Xuất Excel</button>
        </div>

        {/* Hàng 2: khoảng ngày */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-[var(--color-xam)] shrink-0">Từ</span>
          <input type="date" className="tb-input num flex-1 min-w-0" value={tu} onChange={(e) => setTu(e.target.value)} />
          <span className="text-[var(--color-xam)] shrink-0">→</span>
          <input type="date" className="tb-input num flex-1 min-w-0" value={den} onChange={(e) => setDen(e.target.value)} />
        </div>

        {/* Hàng 3: trạng thái + tìm kiếm */}
        <div className="flex gap-2 flex-wrap">
          <select className="tb-input w-full sm:w-auto" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(TEN_TRANG_THAI).map(([gt, ten]) => <option key={gt} value={gt}>{ten}</option>)}
          </select>
          <input className="tb-input flex-1 min-w-40" placeholder="🔍 Mã / tên / SĐT" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="tb-card overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-[var(--color-surface-2)] text-left">
          <tr>{['Mã', 'Giờ nhận', 'Khách', 'Món', 'Nguồn', 'Trạng thái', 'Tổng'].map((h) => <th key={h} className="p-2 text-[var(--color-caphe)] font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {dons.map((d) => (
            <tr key={d.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-surface-2)] cursor-pointer" onClick={() => setXem(d.id)}>
              <td className="p-2 num text-[var(--color-caphe)]">{d.maDon}</td>
              <td className="p-2 num text-[var(--color-caphe)]">{new Date(d.ngayGioNhan).toLocaleString('vi-VN')}</td>
              <td className="p-2 text-[var(--color-caphe)]">{d.khach?.ten}</td>
              <td className="p-2 text-[var(--color-caphe)]">{d.items.map((i) => `${i.soLuong}× ${i.tenMon}`).join(', ')}</td>
              <td className="p-2 text-[var(--color-xam)]">{d.nguon}</td>
              <td className="p-2"><span className={`tb-chip ${d.trangThai === 'hoan_tat' ? 'tb-chip-tra' : d.trangThai === 'huy' ? 'tb-chip-dau' : 'tb-chip-caramel'}`}>{TEN_TRANG_THAI[d.trangThai as TrangThai]}</span></td>
              <td className="p-2 num text-[var(--color-caphe)]">{dinhDangTien(d.tongTien)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {xem != null && (
        <div className="fixed inset-0 bg-[rgba(43,33,25,.45)] z-50 overflow-auto p-4" onClick={() => setXem(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <OrderDetail id={xem} vaiTro="quanly" onDong={() => { setXem(null); tai() }} />
          </div>
        </div>
      )}
    </AppShell>
  )
}
