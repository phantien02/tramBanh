import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { eq } from 'drizzle-orm'

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-test-'))

const { taoDon, chuyenTrangThai, suaDon, layDanhSachDon } = await import('./orders-service')
const { db } = await import('@/db')
const { users, orders, orderItems, orderPhuKien, orderAnhThanhPham } = await import('@/db/schema')

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
  it('phụ kiện được lưu và cộng vào tổng tiền', () => {
    const kq = taoDon({
      ...donMau(Date.now() + 86400000),
      phuKien: [{ ten: 'Nến', gia: 5000, soLuong: 2 }, { ten: 'Pháo', gia: 15000, soLuong: 1 }],
    }, quayId)
    const don = db.select().from(orders).all().find((o) => o.id === kq.id)!
    expect(don.tongTien).toBe(220000 + 5000 * 2 + 15000)
    const pk = db.select().from(orderPhuKien).where(eq(orderPhuKien.orderId, kq.id)).all()
    expect(pk.length).toBe(2)
  })
  it('item có giaBase: server tính lại gia = base + phụ thu, bỏ qua gia client gửi sai', () => {
    const kq = taoDon({
      ...donMau(Date.now() + 86400000),
      items: [{ tenMon: 'Bánh mẫu', coBanh: 'T14', cot: 'Chocolate', topping: ['Oreo vụn'], soLuong: 1, giaBase: 200000, gia: 0 }],
    }, quayId)
    const don = db.select().from(orders).all().find((o) => o.id === kq.id)!
    const it = db.select().from(orderItems).where(eq(orderItems.orderId, kq.id)).all()[0]
    expect(it.giaBase).toBe(200000)
    expect(it.gia).toBe(230000) // 200k + 10% Chocolate (20k) + 5% Oreo (10k)
    expect(don.tongTien).toBe(230000)
  })
  it('đơn ship quà tặng lưu donQuaTang=1; đổi về tại tiệm thì bị xóa cờ', () => {
    const dataShip = {
      ...donMau(Date.now() + 86400000),
      hinhThucNhan: 'ship' as const, diaChiShip: '123 Lê Lợi', donQuaTang: true,
    }
    const kq = taoDon(dataShip, quayId)
    let don = db.select().from(orders).all().find((o) => o.id === kq.id)!
    expect(don.donQuaTang).toBe(1)

    suaDon(kq.id, { ...donMau(Date.now() + 86400000), hinhThucNhan: 'tai_tiem', donQuaTang: true }, quayId)
    don = db.select().from(orders).all().find((o) => o.id === kq.id)!
    expect(don.donQuaTang).toBe(0)
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
  it('bấm Xong kèm ảnh thành phẩm → ảnh lưu vào đơn; không ảnh → không lưu', () => {
    const bep = { id: bepId, username: 'b1', hoTen: 'Bếp 1', vaiTro: 'bep' as const }
    const { id } = taoDon(donMau(Date.now() + 86400000), quayId)
    chuyenTrangThai(id, 'dang_lam', bep)
    expect(chuyenTrangThai(id, 'banh_xong', bep, { anhThanhPham: ['a1.jpg', 'a2.jpg'] }).ok).toBe(true)
    const anh = db.select().from(orderAnhThanhPham).where(eq(orderAnhThanhPham.orderId, id)).all()
    expect(anh.map((a) => a.filePath)).toEqual(['a1.jpg', 'a2.jpg'])

    const { id: id2 } = taoDon(donMau(Date.now() + 86400000), quayId)
    chuyenTrangThai(id2, 'dang_lam', bep)
    expect(chuyenTrangThai(id2, 'banh_xong', bep).ok).toBe(true)
    expect(db.select().from(orderAnhThanhPham).where(eq(orderAnhThanhPham.orderId, id2)).all().length).toBe(0)
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

  it('lưu với hinhThucNhan khác ship → xóa diaChiShip/sdtNguoiNhan, phiShip=0', () => {
    const { id } = taoDon(donMau(Date.now() + 86400000), quayId)
    const dataShip = {
      ...donMau(Date.now() + 86400000),
      hinhThucNhan: 'ship' as const,
      diaChiShip: '123 Lê Lợi', sdtNguoiNhan: '0909009009', phiShip: 20000,
    }
    suaDon(id, dataShip, quayId)
    let don = db.select().from(orders).all().find((o) => o.id === id)!
    expect(don.diaChiShip).toBe('123 Lê Lợi')
    expect(don.phiShip).toBe(20000)

    suaDon(id, { ...donMau(Date.now() + 86400000), hinhThucNhan: 'tai_tiem' }, quayId)
    don = db.select().from(orders).all().find((o) => o.id === id)!
    expect(don.diaChiShip).toBeNull()
    expect(don.sdtNguoiNhan).toBeNull()
    expect(don.phiShip).toBe(0)
  })

  it('rollback khi item hỏng (productId không tồn tại) → items gốc của đơn còn nguyên', () => {
    const { id } = taoDon(donMau(Date.now() + 86400000), quayId)
    const truoc = db.select().from(orderItems).where(eq(orderItems.orderId, id)).all()
    expect(truoc.length).toBe(1)

    const hong = {
      ...donMau(Date.now() + 86400000),
      items: [{ productId: 999999, tenMon: 'Bánh lỗi', soLuong: 1, gia: 100000 }],
    }
    expect(() => suaDon(id, hong, quayId)).toThrow()

    const sau = db.select().from(orderItems).where(eq(orderItems.orderId, id)).all()
    expect(sau.length).toBe(1)
    expect(sau[0].tenMon).toBe(truoc[0].tenMon)
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
