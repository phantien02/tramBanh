import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

process.env.DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-test-'))

const { tinhThongKe } = await import('./thong-ke')
const { taoDon, chuyenTrangThai } = await import('./orders-service')
const { db } = await import('@/db')
const { users } = await import('@/db/schema')

describe('tinhThongKe', () => {
  it('doanh thu chỉ tính đơn hoàn tất, đếm nguồn và món', () => {
    const uid = db.insert(users).values({ username: 'q-tk', passwordHash: 'x', hoTen: 'Q', vaiTro: 'quay' }).returning().get().id
    const quay = { id: uid, username: 'q-tk', hoTen: 'Q', vaiTro: 'quay' as const }
    const now = Date.now()

    const a = taoDon({
      khach: { sdt: '0900000001', ten: 'A' }, nguon: 'zalo', ngayGioNhan: now + 3600000,
      hinhThucNhan: 'tai_tiem',
      items: [{ tenMon: 'Bánh kem bắp', soLuong: 2, gia: 150000 }],
    }, uid)
    chuyenTrangThai(a.id, 'hoan_tat', quay, { ketThucKieu: 'giao_khach' }) // moi→hoan_tat: lấy ngay

    taoDon({ // đơn chưa hoàn tất → không tính doanh thu
      khach: { sdt: '0900000002', ten: 'B' }, nguon: 'messenger', ngayGioNhan: now + 3600000,
      hinhThucNhan: 'tai_tiem', items: [{ tenMon: 'Bánh su kem', soLuong: 1, gia: 45000 }],
    }, uid)

    const tk = tinhThongKe(now - 86400000, now + 86400000)
    expect(tk.doanhThu).toBe(300000)
    expect(tk.soDon).toBe(2)
    expect(tk.theoNguon.find((n) => n.nguon === 'zalo')!.soDon).toBe(1)
    expect(tk.monBanChay[0]).toEqual({ tenMon: 'Bánh kem bắp', soLuong: 2 })
  })
})
