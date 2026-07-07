'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '@/components/AppShell'
import StatBar from '@/components/StatBar'
import { useRealtime } from '@/components/useRealtime'
import { dauCuoiNgay, dinhDangTien } from '@/lib/time'
import type { SessionUser } from '@/lib/session'

type ThongKe = {
  doanhThu: number; soDon: number; soDonHuy: number; tiLeTreHan: number
  theoNgay: { ngay: string; doanhThu: number; soDon: number }[]
  theoNguon: { nguon: string; soDon: number }[]
  monBanChay: { tenMon: string; soLuong: number }[]
  theoGio: { gio: number; soDon: number }[]
  khachMuaNhieu: { ten: string; sdt: string; soDon: number; tongChi: number }[]
}

const TEN_NGUON: Record<string, string> = { tai_quay: 'Tại quầy', zalo: 'Zalo', messenger: 'Messenger', dien_thoai: 'Điện thoại', khac: 'Khác' }
const KHOANG = [['homnay', 'Hôm nay', 0], ['tuan', '7 ngày', 6], ['thang', '30 ngày', 29]] as const

type Khoang = 'homnay' | 'tuan' | 'thang' | 'tuychinh'

// dd/MM cho nhãn khoảng đang xem
function nhanNgayNgan(ms: number): string {
  return new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export default function QuanLyPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [khoang, setKhoang] = useState<Khoang>('tuan')
  const [tk, setTk] = useState<ThongKe | null>(null)
  // ô ngày tùy chỉnh (chuỗi yyyy-MM-dd của <input type="date">)
  const [tuNgay, setTuNgay] = useState('')
  const [denNgay, setDenNgay] = useState('')
  // mốc ms đang thực sự xem
  const [mocXem, setMocXem] = useState<{ tu: number; cuoi: number } | null>(null)
  const mocRef = useRef<{ tu: number; cuoi: number } | null>(null) // để realtime refetch đúng khoảng, KHÔNG làm dependency (tránh vòng lặp)
  const [loi, setLoi] = useState('')

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])

  const taiKhoangMs = useCallback(async (tu: number, cuoi: number) => {
    mocRef.current = { tu, cuoi }
    setMocXem({ tu, cuoi })
    setTk(await fetch(`/api/thong-ke?tu=${tu}&den=${cuoi}`).then((r) => r.json()))
  }, [])

  // Chỉ chạy khi ĐỔI preset (không phụ thuộc mocXem → không lặp). Tùy chỉnh chờ nút "Xem".
  useEffect(() => {
    if (khoang === 'tuychinh') return
    const soNgay = KHOANG.find(([k]) => k === khoang)![2]
    const homNay = dauCuoiNgay(new Date())
    const tu = dauCuoiNgay(new Date(Date.now() - soNgay * 86400000)).dau
    taiKhoangMs(tu, homNay.cuoi)
  }, [khoang, taiKhoangMs])

  // realtime: refetch đúng khoảng đang xem qua ref (không tạo dependency loop)
  const { ketNoi } = useRealtime(() => { if (mocRef.current) taiKhoangMs(mocRef.current.tu, mocRef.current.cuoi) }, () => false)

  const chonPreset = (k: Exclude<Khoang, 'tuychinh'>) => { setLoi(''); setKhoang(k) }

  const xemTuyChinh = () => {
    if (!tuNgay || !denNgay) { setLoi('Vui lòng chọn cả hai ngày.'); return }
    const tu = dauCuoiNgay(new Date(tuNgay)).dau
    const cuoi = dauCuoiNgay(new Date(denNgay)).cuoi
    if (tu > cuoi) { setLoi('Ngày "từ" phải trước hoặc bằng ngày "đến".'); return }
    setLoi('')
    setKhoang('tuychinh')
    taiKhoangMs(tu, cuoi)
  }

  if (!user || !tk) return null
  return (
    <AppShell user={user} tieuDe="Quản lý" ketNoi={ketNoi}>
      <div className="flex gap-2 mb-2 flex-wrap items-center">
        {KHOANG.map(([k, ten]) => (
          <button key={k} onClick={() => chonPreset(k)}
            className={khoang === k ? 'btn-primary' : 'tb-btn-ghost'}>{ten}</button>
        ))}
        <button onClick={() => { setLoi(''); setKhoang('tuychinh') }}
          className={khoang === 'tuychinh' ? 'btn-primary' : 'tb-btn-ghost'}>Tùy chỉnh</button>
        {mocXem && (
          <span className="text-sm text-[var(--color-xam)]">
            Đang xem: <span className="num text-[var(--color-caphe)]">{nhanNgayNgan(mocXem.tu)} → {nhanNgayNgan(mocXem.cuoi)}</span>
          </span>
        )}
        <nav className="ml-auto flex gap-2">
          {[['/quanly/don', '📋 Tất cả đơn'], ['/quanly/banh', '🎂 Danh mục bánh'], ['/quanly/nhan-vien', '👥 Nhân viên']].map(([href, ten]) => (
            <a key={href} href={href} className="tb-btn-ghost">{ten}</a>
          ))}
        </nav>
      </div>

      {khoang === 'tuychinh' && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <label className="text-sm text-[var(--color-xam)]">Từ ngày
            <input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} className="tb-input ml-2" />
          </label>
          <label className="text-sm text-[var(--color-xam)]">Đến ngày
            <input type="date" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} className="tb-input ml-2" />
          </label>
          <button onClick={xemTuyChinh} className="btn-primary">Xem</button>
          {loi && <span className="text-sm text-[var(--color-caramel-600)]">{loi}</span>}
        </div>
      )}
      {khoang !== 'tuychinh' && <div className="mb-4" />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[['Doanh thu', dinhDangTien(tk.doanhThu)], ['Số đơn', String(tk.soDon)],
          ['Đơn hủy', String(tk.soDonHuy)], ['Tỉ lệ trễ hạn', `${tk.tiLeTreHan}%`]].map(([ten, gt], i) => (
          <div key={ten} className="bg-[var(--color-surface-2)] rounded-xl p-4">
            <div className="text-[var(--color-xam)] text-xs uppercase tracking-wider">{ten}</div>
            <div className={`num text-2xl mt-1 ${i === 0 ? 'text-[var(--color-caramel-600)]' : 'text-[var(--color-caphe)]'}`}>{gt}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="tb-card p-4"><h2 className="font-display font-semibold text-[var(--color-caphe)] mb-2">Doanh thu theo ngày</h2>
          <StatBar data={tk.theoNgay.map((d) => ({ nhan: d.ngay, giaTri: d.doanhThu, hienThi: dinhDangTien(d.doanhThu) }))} /></section>
        <section className="tb-card p-4"><h2 className="font-display font-semibold text-[var(--color-caphe)] mb-2">Đơn theo nguồn</h2>
          <StatBar data={tk.theoNguon.map((d) => ({ nhan: TEN_NGUON[d.nguon] ?? d.nguon, giaTri: d.soDon }))} /></section>
        <section className="tb-card p-4"><h2 className="font-display font-semibold text-[var(--color-caphe)] mb-2">Món bán chạy</h2>
          <StatBar data={tk.monBanChay.map((d) => ({ nhan: d.tenMon, giaTri: d.soLuong }))} /></section>
        <section className="tb-card p-4"><h2 className="font-display font-semibold text-[var(--color-caphe)] mb-2">Giờ cao điểm (giờ khách nhận)</h2>
          <StatBar data={tk.theoGio.map((d) => ({ nhan: `${d.gio}h`, giaTri: d.soDon }))} /></section>
        <section className="tb-card p-4"><h2 className="font-display font-semibold text-[var(--color-caphe)] mb-2">Khách quen mua nhiều</h2>
          <StatBar data={tk.khachMuaNhieu.map((k) => ({ nhan: `${k.ten} (${k.sdt.slice(-4)})`, giaTri: k.soDon, hienThi: `${k.soDon} đơn — ${dinhDangTien(k.tongChi)}` }))} /></section>
      </div>
    </AppShell>
  )
}
