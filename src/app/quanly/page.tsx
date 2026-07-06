'use client'
import { useCallback, useEffect, useState } from 'react'
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

export default function QuanLyPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [khoang, setKhoang] = useState<'homnay' | 'tuan' | 'thang'>('tuan')
  const [tk, setTk] = useState<ThongKe | null>(null)

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])

  const tai = useCallback(async () => {
    const soNgay = KHOANG.find(([k]) => k === khoang)![2]
    const homNay = dauCuoiNgay(new Date())
    const tu = dauCuoiNgay(new Date(Date.now() - soNgay * 86400000)).dau
    setTk(await fetch(`/api/thong-ke?tu=${tu}&den=${homNay.cuoi}`).then((r) => r.json()))
  }, [khoang])

  useEffect(() => { tai() }, [tai])
  const { ketNoi } = useRealtime(() => tai(), () => false)

  if (!user || !tk) return null
  return (
    <AppShell user={user} tieuDe="Quản lý" ketNoi={ketNoi}>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {KHOANG.map(([k, ten]) => (
          <button key={k} onClick={() => setKhoang(k)}
            className={`px-4 py-2 rounded-lg border font-medium ${khoang === k ? 'bg-pink-600 text-white border-pink-600' : 'bg-white'}`}>{ten}</button>
        ))}
        <nav className="ml-auto flex gap-2">
          {[['/quanly/don', '📋 Tất cả đơn'], ['/quanly/banh', '🎂 Danh mục bánh'], ['/quanly/nhan-vien', '👥 Nhân viên']].map(([href, ten]) => (
            <a key={href} href={href} className="px-4 py-2 rounded-lg bg-white border font-medium hover:border-pink-500">{ten}</a>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[['Doanh thu', dinhDangTien(tk.doanhThu)], ['Số đơn', String(tk.soDon)],
          ['Đơn hủy', String(tk.soDonHuy)], ['Tỉ lệ trễ hạn', `${tk.tiLeTreHan}%`]].map(([ten, gt]) => (
          <div key={ten} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-gray-500 text-sm">{ten}</div>
            <div className="text-2xl font-bold">{gt}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl p-4"><h2 className="font-bold mb-2">Doanh thu theo ngày</h2>
          <StatBar data={tk.theoNgay.map((d) => ({ nhan: d.ngay, giaTri: d.doanhThu, hienThi: dinhDangTien(d.doanhThu) }))} /></section>
        <section className="bg-white rounded-xl p-4"><h2 className="font-bold mb-2">Đơn theo nguồn</h2>
          <StatBar data={tk.theoNguon.map((d) => ({ nhan: TEN_NGUON[d.nguon] ?? d.nguon, giaTri: d.soDon }))} /></section>
        <section className="bg-white rounded-xl p-4"><h2 className="font-bold mb-2">Món bán chạy</h2>
          <StatBar data={tk.monBanChay.map((d) => ({ nhan: d.tenMon, giaTri: d.soLuong }))} /></section>
        <section className="bg-white rounded-xl p-4"><h2 className="font-bold mb-2">Giờ cao điểm (giờ khách nhận)</h2>
          <StatBar data={tk.theoGio.map((d) => ({ nhan: `${d.gio}h`, giaTri: d.soDon }))} /></section>
        <section className="bg-white rounded-xl p-4"><h2 className="font-bold mb-2">Khách quen mua nhiều</h2>
          <StatBar data={tk.khachMuaNhieu.map((k) => ({ nhan: `${k.ten} (${k.sdt.slice(-4)})`, giaTri: k.soDon, hienThi: `${k.soDon} đơn — ${dinhDangTien(k.tongChi)}` }))} /></section>
      </div>
    </AppShell>
  )
}
