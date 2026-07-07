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
      <div className="flex gap-2 mb-4 flex-wrap items-center tb-card p-3">
        {([['Hôm nay', 0], ['7 ngày', 6], ['30 ngày', 29]] as const).map(([ten, n]) => (
          <button key={ten} className="tb-btn-ghost text-sm px-3 py-1.5"
            onClick={() => { setTu(toDateInput(Date.now() - n * 86400000)); setDen(toDateInput(Date.now())) }}>{ten}</button>
        ))}
        <span className="w-px h-6 bg-[var(--color-line)] mx-1" />
        <input type="date" className="tb-input num w-auto" value={tu} onChange={(e) => setTu(e.target.value)} />
        <span className="text-[var(--color-xam)]">→</span>
        <input type="date" className="tb-input num w-auto" value={den} onChange={(e) => setDen(e.target.value)} />
        <select className="tb-input w-auto" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(TEN_TRANG_THAI).map(([gt, ten]) => <option key={gt} value={gt}>{ten}</option>)}
        </select>
        <input className="tb-input flex-1 min-w-40" placeholder="🔍 Mã / tên / SĐT" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={taiCsv} className="btn-primary">⬇ Tải CSV</button>
      </div>

      <div className="tb-card overflow-hidden">
      <table className="w-full text-sm">
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
