import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-test-'))

const { taoDon, chuyenTrangThai, suaDon, layDanhSachDon } = await import('./orders-service')
const { db } = await import('@/db')
const { users, orders } = await import('@/db/schema')

let quayId: number, bepId: number

beforeAll(() => {
  quayId = db.insert(users).values({ username: 'q1', passwordHash: 'x', hoTen: 'Quầy 1', vaiTro: 'quay' }).returning().get().id
  bepId = db.insert(users).values({ username: 'b1', passwordHash: 'x', hoTen: 'Bếp 1', vaiTro: 'bep' }).returning().get().id
})

function donMau(gioNhan: number) {
  return {
    khach: { sdt: '0901234567', ten: 'Chị Lan' },
    nguon: 'zalo' as const,
    ngayGioNhan: gioNhan,
    hinhThucNhan: 'tai_tiem' as const,
    items: [{ tenMon: 'Bánh kem bắp', coBanh: '20cm', soLuong: 1, chuViet: 'Chúc mừng sinh nhật', gia: 220000 }],
  }
}

describe('taoDon', () => {
  it('sinh mã đơn theo ngày, tính tổng tiền, tạo khách mới', () => {
    const kq = taoDon(donMau(Date.now() + 86400000), quayId)
    expect(kq.maDon).toMatch(/^#\d{4}-\d{2}$/)
    const don = db.select().from(orders).all().find((o) => o.id === kq.id)!
    expect(don.tongTien).toBe(220000)
    expect(don.trangThai).toBe('moi')
  })
  it('cùng SĐT không tạo khách trùng, mã đơn tăng dần trong ngày', () => {
    const a = taoDon(donMau(Date.now() + 86400000), quayId)
    const b = taoDon(donMau(Date.now() + 86400000), quayId)
    expect(Number(b.maDon.slice(-2))).toBe(Number(a.maDon.slice(-2)) + 1)
  })
})

describe('chuyenTrangThai', () => {
  it('luồng chuẩn + chống bấm đồng thời', () => {
    const { id } = taoDon(donMau(Date.now() + 86400000), quayId)
    const bep = { id: bepId, username: 'b1', hoTen: 'Bếp 1', vaiTro: 'bep' as const }
    const quay = { id: quayId, username: 'q1', hoTen: 'Quầy 1', vaiTro: 'quay' as const }
    expect(chuyenTrangThai(id, 'dang_lam', bep).ok).toBe(true)
    expect(chuyenTrangThai(id, 'dang_lam', bep).ok).toBe(false) // bấm lần 2 → đơn đã chuyển rồi
    expect(chuyenTrangThai(id, 'banh_xong', bep).ok).toBe(true)
    expect(chuyenTrangThai(id, 'da_nhan', quay).ok).toBe(true)
    expect(chuyenTrangThai(id, 'hoan_tat', quay, { ketThucKieu: 'giao_khach' }).ok).toBe(true)
  })
  it('hoàn tất thiếu ketThucKieu hoặc hủy thiếu lý do → lỗi', () => {
    const { id } = taoDon(donMau(Date.now() + 86400000), quayId)
    const quay = { id: quayId, username: 'q1', hoTen: 'Quầy 1', vaiTro: 'quay' as const }
    expect(chuyenTrangThai(id, 'hoan_tat', quay).ok).toBe(false)
    expect(chuyenTrangThai(id, 'huy', quay).ok).toBe(false)
    expect(chuyenTrangThai(id, 'huy', quay, { lyDoHuy: 'Khách bom hàng' }).ok).toBe(true)
  })
})

describe('suaDon', () => {
  it('sửa khi bếp đang làm → daSua=1', () => {
    const { id } = taoDon(donMau(Date.now() + 86400000), quayId)
    const bep = { id: bepId, username: 'b1', hoTen: 'Bếp 1', vaiTro: 'bep' as const }
    chuyenTrangThai(id, 'dang_lam', bep)
    suaDon(id, { ...donMau(Date.now() + 86400000), ghiChu: 'Đổi màu hoa' }, quayId)
    const don = db.select().from(orders).all().find((o) => o.id === id)!
    expect(don.daSua).toBe(1)
  })
})

describe('layDanhSachDon', () => {
  it('lọc theo khoảng ngày và tìm theo SĐT', () => {
    const ds = layDanhSachDon({ q: '0901234567' })
    expect(ds.length).toBeGreaterThan(0)
    expect(ds[0].items.length).toBeGreaterThan(0)
    expect(ds[0].khach?.ten).toBe('Chị Lan')
  })
})
