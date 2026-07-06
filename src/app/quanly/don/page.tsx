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

  function taiCsv() {
    const dong = [
      ['Mã đơn', 'Ngày giờ nhận', 'Khách', 'SĐT', 'Nguồn', 'Trạng thái', 'Món', 'Tổng tiền', 'Cọc'].join(';'),
      ...dons.map((d) => [
        d.maDon, new Date(d.ngayGioNhan).toLocaleString('vi-VN'), d.khach?.ten ?? '', d.khach?.sdt ?? '',
        d.nguon, TEN_TRANG_THAI[d.trangThai as TrangThai],
        d.items.map((i) => `${i.soLuong}x ${i.tenMon}`).join(', '), d.tongTien, d.tienCoc,
      ].map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';')),
    ].join('\r\n')
    const bom = String.fromCharCode(0xfeff) // BOM để Excel đọc đúng tiếng Việt
    const blob = new Blob([bom + dong], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `don-hang-${tu}-den-${den}.csv`
    a.click()
  }

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Tất cả đơn">
      <div className="flex gap-2 mb-4 flex-wrap items-center bg-white rounded-xl p-3">
        <input type="date" className="border rounded-lg p-2" value={tu} onChange={(e) => setTu(e.target.value)} />
        <span>→</span>
        <input type="date" className="border rounded-lg p-2" value={den} onChange={(e) => setDen(e.target.value)} />
        <select className="border rounded-lg p-2" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(TEN_TRANG_THAI).map(([gt, ten]) => <option key={gt} value={gt}>{ten}</option>)}
        </select>
        <input className="border rounded-lg p-2 flex-1 min-w-40" placeholder="🔍 Mã / tên / SĐT" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={taiCsv} className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium">⬇ Tải CSV</button>
      </div>

      <table className="w-full bg-white rounded-xl overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>{['Mã', 'Giờ nhận', 'Khách', 'Món', 'Nguồn', 'Trạng thái', 'Tổng'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {dons.map((d) => (
            <tr key={d.id} className="border-t hover:bg-pink-50 cursor-pointer" onClick={() => setXem(d.id)}>
              <td className="p-2 font-bold">{d.maDon}</td>
              <td className="p-2">{new Date(d.ngayGioNhan).toLocaleString('vi-VN')}</td>
              <td className="p-2">{d.khach?.ten}</td>
              <td className="p-2">{d.items.map((i) => `${i.soLuong}× ${i.tenMon}`).join(', ')}</td>
              <td className="p-2">{d.nguon}</td>
              <td className="p-2">{TEN_TRANG_THAI[d.trangThai as TrangThai]}</td>
              <td className="p-2 font-medium">{dinhDangTien(d.tongTien)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {xem != null && (
        <div className="fixed inset-0 bg-black/50 z-20 overflow-auto p-4" onClick={() => setXem(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <OrderDetail id={xem} vaiTro="quanly" onDong={() => { setXem(null); tai() }} />
          </div>
        </div>
      )}
    </AppShell>
  )
}
