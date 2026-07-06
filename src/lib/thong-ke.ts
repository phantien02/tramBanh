import { and, gte, lte, eq, like } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems, orderEvents, customers } from '@/db/schema'

export function tinhThongKe(tu: number, den: number) {
  const ds = db.select().from(orders)
    .where(and(gte(orders.ngayGioNhan, tu), lte(orders.ngayGioNhan, den))).all()

  const hoanTat = ds.filter((d) => d.trangThai === 'hoan_tat')
  const doanhThu = hoanTat.reduce((s, d) => s + d.tongTien, 0)

  const theoNgayMap = new Map<string, { doanhThu: number; soDon: number }>()
  const theoGioMap = new Map<number, number>()
  for (const d of ds) {
    const ngay = new Date(d.ngayGioNhan).toLocaleDateString('vi-VN')
    const o = theoNgayMap.get(ngay) ?? { doanhThu: 0, soDon: 0 }
    o.soDon++
    if (d.trangThai === 'hoan_tat') o.doanhThu += d.tongTien
    theoNgayMap.set(ngay, o)
    const gio = new Date(d.ngayGioNhan).getHours()
    theoGioMap.set(gio, (theoGioMap.get(gio) ?? 0) + 1)
  }

  const theoNguonMap = new Map<string, number>()
  for (const d of ds) theoNguonMap.set(d.nguon, (theoNguonMap.get(d.nguon) ?? 0) + 1)

  const monMap = new Map<string, number>()
  for (const d of hoanTat) {
    for (const it of db.select().from(orderItems).where(eq(orderItems.orderId, d.id)).all()) {
      monMap.set(it.tenMon, (monMap.get(it.tenMon) ?? 0) + it.soLuong)
    }
  }

  // trễ hạn: event chuyển sang hoan_tat xảy ra sau ngayGioNhan
  let tre = 0
  for (const d of hoanTat) {
    const ev = db.select().from(orderEvents)
      .where(and(eq(orderEvents.orderId, d.id), like(orderEvents.hanhDong, '%->hoan_tat'))).get()
    if (ev && ev.thoiDiem > d.ngayGioNhan) tre++
  }

  // khách quen mua nhiều (theo số đơn hoàn tất trong khoảng)
  const khachMap = new Map<number, { soDon: number; tongChi: number }>()
  for (const d of hoanTat) {
    if (d.customerId == null) continue
    const o = khachMap.get(d.customerId) ?? { soDon: 0, tongChi: 0 }
    o.soDon++; o.tongChi += d.tongTien
    khachMap.set(d.customerId, o)
  }
  const khachMuaNhieu = [...khachMap]
    .sort((a, b) => b[1].soDon - a[1].soDon).slice(0, 10)
    .map(([customerId, v]) => {
      const k = db.select().from(customers).where(eq(customers.id, customerId)).get()
      return { ten: k?.ten ?? '?', sdt: k?.sdt ?? '', ...v }
    })

  return {
    doanhThu,
    soDon: ds.length,
    soDonHuy: ds.filter((d) => d.trangThai === 'huy').length,
    theoNgay: [...theoNgayMap].map(([ngay, v]) => ({ ngay, ...v })),
    theoNguon: [...theoNguonMap].map(([nguon, soDon]) => ({ nguon, soDon })),
    monBanChay: [...monMap].map(([tenMon, soLuong]) => ({ tenMon, soLuong }))
      .sort((a, b) => b.soLuong - a.soLuong).slice(0, 10),
    tiLeTreHan: hoanTat.length ? Math.round((tre / hoanTat.length) * 100) : 0,
    theoGio: [...theoGioMap].map(([gio, soDon]) => ({ gio, soDon })).sort((a, b) => a.gio - b.gio),
    khachMuaNhieu,
  }
}
