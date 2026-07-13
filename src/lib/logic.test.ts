import { describe, it, expect } from 'vitest'
import { taoMaDon } from './order-code'
import { tinhTongTien, tinhConLai, tinhGiaMon, phanTichGiaMon, phuThuVi } from './money'
import { canNhacNho, MOC_NHAC_NHO_MS } from './reminder'
import { dauCuoiNgay, mucCanhBao } from './time'

describe('taoMaDon', () => {
  it('định dạng #DDMM-NN', () => {
    expect(taoMaDon(new Date(2026, 6, 6), 3)).toBe('#0607-03')
    expect(taoMaDon(new Date(2026, 11, 31), 12)).toBe('#3112-12')
  })
})

describe('tiền', () => {
  it('tổng = sum(giá×SL) + phí ship', () => {
    expect(tinhTongTien([{ gia: 150000, soLuong: 1 }, { gia: 45000, soLuong: 2 }], 20000)).toBe(260000)
  })
  it('tổng có phụ kiện = sum(giá×SL) + sum(giá phụ kiện×SL) + phí ship', () => {
    expect(tinhTongTien([{ gia: 150000, soLuong: 1 }], 20000, [{ gia: 5000, soLuong: 2 }, { gia: 15000, soLuong: 1 }])).toBe(195000)
  })
  it('còn lại = tổng - cọc, không âm', () => {
    expect(tinhConLai(260000, 100000)).toBe(160000)
    expect(tinhConLai(100000, 150000)).toBe(0)
  })
})

describe('giá món (base + phụ thu)', () => {
  const opts = [
    { loai: 'cot', ten: 'Vanilla', phuThuKieu: null, phuThuGiaTri: 0 },
    { loai: 'cot', ten: 'Chocolate', phuThuKieu: 'phan_tram' as const, phuThuGiaTri: 10 },
    { loai: 'kem', ten: 'Kem mặc định', phuThuKieu: null, phuThuGiaTri: 0 },
    { loai: 'kem', ten: 'Kem bơ', phuThuKieu: 'tien' as const, phuThuGiaTri: 8000 },
    { loai: 'mut', ten: 'Chanh leo', phuThuKieu: null, phuThuGiaTri: 0 },
    { loai: 'mut', ten: 'Đào', phuThuKieu: 'tien' as const, phuThuGiaTri: 5000 },
    { loai: 'mut', ten: 'Sốt đường đen', phuThuKieu: 'tien' as const, phuThuGiaTri: 10000 },
    { loai: 'topping', ten: 'Trái cây hỗn hợp theo mùa', phuThuKieu: 'phan_tram' as const, phuThuGiaTri: 10 },
    { loai: 'topping', ten: 'Oreo vụn', phuThuKieu: 'phan_tram' as const, phuThuGiaTri: 5 },
  ]

  it('cốt/mứt miễn phí → bằng đúng base', () => {
    expect(tinhGiaMon(200000, { cot: 'Vanilla', mut: 'Chanh leo', topping: [] }, opts)).toBe(200000)
  })
  it('% tính trên base, cộng dồn', () => {
    // 200k + 10% cốt + 10% trái cây + 5% oreo = 200 + 20 + 20 + 10 = 250k
    expect(tinhGiaMon(200000, { cot: 'Chocolate', mut: 'Chanh leo', topping: ['Trái cây hỗn hợp theo mùa', 'Oreo vụn'] }, opts)).toBe(250000)
  })
  it('phụ thu tiền cố định cộng thẳng', () => {
    expect(tinhGiaMon(200000, { cot: 'Vanilla', mut: 'Đào', topping: [] }, opts)).toBe(205000)
    expect(tinhGiaMon(200000, { cot: 'Vanilla', mut: 'Sốt đường đen', topping: [] }, opts)).toBe(210000)
  })
  it('% ra số lẻ → làm tròn 1.000đ', () => {
    // base 203k → 10% = 20.300 → 20.000
    expect(phuThuVi(203000, opts[1])).toBe(20000)
    // base 207k → 10% = 20.700 → 21.000
    expect(phuThuVi(207000, opts[1])).toBe(21000)
  })
  it('phân tích trả breakdown khớp tổng', () => {
    const r = phanTichGiaMon(200000, { cot: 'Chocolate', mut: 'Đào', topping: ['Oreo vụn'] }, opts)
    expect(r.base).toBe(200000)
    expect(r.tong).toBe(200000 + 20000 + 5000 + 10000)
    expect(r.phuThu).toEqual([
      { loai: 'cot', ten: 'Chocolate', tien: 20000 },
      { loai: 'mut', ten: 'Đào', tien: 5000 },
      { loai: 'topping', ten: 'Oreo vụn', tien: 10000 },
    ])
  })
  it('vị không có trong danh mục → bỏ qua (đơn cũ)', () => {
    expect(tinhGiaMon(200000, { cot: 'Vị lạ', mut: null, topping: ['Topping lạ'] }, opts)).toBe(200000)
  })
  it('kem mặc định miễn phí → bằng base', () => {
    expect(tinhGiaMon(200000, { cot: 'Vanilla', kem: 'Kem mặc định', mut: 'Chanh leo', topping: [] }, opts)).toBe(200000)
  })
  it('kem có phụ thu tiền cố định cộng thẳng', () => {
    expect(tinhGiaMon(200000, { cot: 'Vanilla', kem: 'Kem bơ', mut: 'Chanh leo', topping: [] }, opts)).toBe(208000)
  })
  it('breakdown xếp đúng thứ tự cốt → kem → mứt → topping', () => {
    const r = phanTichGiaMon(200000, { cot: 'Chocolate', kem: 'Kem bơ', mut: 'Đào', topping: ['Oreo vụn'] }, opts)
    expect(r.tong).toBe(200000 + 20000 + 8000 + 5000 + 10000)
    expect(r.phuThu).toEqual([
      { loai: 'cot', ten: 'Chocolate', tien: 20000 },
      { loai: 'kem', ten: 'Kem bơ', tien: 8000 },
      { loai: 'mut', ten: 'Đào', tien: 5000 },
      { loai: 'topping', ten: 'Oreo vụn', tien: 10000 },
    ])
  })
})

describe('canNhacNho', () => {
  const gioNhan = new Date(2026, 6, 6, 15, 0).getTime() // 15:00
  it('nhắc khi còn ≤2h và chưa xong, chưa nhắc', () => {
    const now = gioNhan - MOC_NHAC_NHO_MS + 60000 // còn 1h59'
    expect(canNhacNho({ ngayGioNhan: gioNhan, trangThai: 'moi', nhacNho: 0 }, now)).toBe(true)
    expect(canNhacNho({ ngayGioNhan: gioNhan, trangThai: 'dang_lam', nhacNho: 0 }, now)).toBe(true)
  })
  it('không nhắc khi còn >2h', () => {
    const now = gioNhan - MOC_NHAC_NHO_MS - 60000
    expect(canNhacNho({ ngayGioNhan: gioNhan, trangThai: 'moi', nhacNho: 0 }, now)).toBe(false)
  })
  it('không nhắc khi đã xong/đã nhận/hoàn tất/hủy hoặc đã nhắc rồi', () => {
    const now = gioNhan - 60000
    for (const tt of ['banh_xong', 'da_nhan', 'hoan_tat', 'huy']) {
      expect(canNhacNho({ ngayGioNhan: gioNhan, trangThai: tt, nhacNho: 0 }, now)).toBe(false)
    }
    expect(canNhacNho({ ngayGioNhan: gioNhan, trangThai: 'moi', nhacNho: 1 }, now)).toBe(false)
  })
  it('vẫn nhắc cả khi đã quá giờ nhận mà chưa xong', () => {
    expect(canNhacNho({ ngayGioNhan: gioNhan, trangThai: 'dang_lam', nhacNho: 0 }, gioNhan + 60000)).toBe(true)
  })
})

describe('time', () => {
  it('dauCuoiNgay bao trọn 24h', () => {
    const { dau, cuoi } = dauCuoiNgay(new Date(2026, 6, 6, 13, 45))
    expect(dau).toBe(new Date(2026, 6, 6, 0, 0, 0, 0).getTime())
    expect(cuoi).toBe(new Date(2026, 6, 6, 23, 59, 59, 999).getTime())
  })
  it('mucCanhBao: bình thường → sắp đến hạn (≤2h) → trễ hạn (quá giờ, chưa hoàn tất)', () => {
    const gioNhan = new Date(2026, 6, 6, 15, 0).getTime()
    expect(mucCanhBao({ ngayGioNhan: gioNhan, trangThai: 'moi' }, gioNhan - 3 * 3600000)).toBe('binh_thuong')
    expect(mucCanhBao({ ngayGioNhan: gioNhan, trangThai: 'moi' }, gioNhan - 3600000)).toBe('sap_den_han')
    expect(mucCanhBao({ ngayGioNhan: gioNhan, trangThai: 'dang_lam' }, gioNhan + 1)).toBe('tre_han')
    expect(mucCanhBao({ ngayGioNhan: gioNhan, trangThai: 'hoan_tat' }, gioNhan + 9999999)).toBe('binh_thuong')
  })
})
