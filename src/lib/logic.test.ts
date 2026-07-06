import { describe, it, expect } from 'vitest'
import { taoMaDon } from './order-code'
import { tinhTongTien, tinhConLai } from './money'
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
  it('còn lại = tổng - cọc, không âm', () => {
    expect(tinhConLai(260000, 100000)).toBe(160000)
    expect(tinhConLai(100000, 150000)).toBe(0)
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
