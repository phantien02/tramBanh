import { describe, it, expect } from 'vitest'
import { dinhDangKhoang, noteThoiGian } from './time'

describe('dinhDangKhoang', () => {
  it('dưới 60 phút → "x phút"', () => {
    expect(dinhDangKhoang(15 * 60000)).toBe('15 phút')
    expect(dinhDangKhoang(0)).toBe('0 phút')
    expect(dinhDangKhoang(59 * 60000)).toBe('59 phút')
  })
  it('tròn giờ → "x giờ"', () => {
    expect(dinhDangKhoang(60 * 60000)).toBe('1 giờ')
    expect(dinhDangKhoang(3 * 60 * 60000)).toBe('3 giờ')
  })
  it('lẻ phút → "xhyy"', () => {
    expect(dinhDangKhoang((2 * 60 + 15) * 60000)).toBe('2h15')
    expect(dinhDangKhoang((1 * 60 + 5) * 60000)).toBe('1h05')
  })
  it('âm → kẹp về 0', () => {
    expect(dinhDangKhoang(-5000)).toBe('0 phút')
  })
})

describe('noteThoiGian', () => {
  const now = 1_000_000_000_000
  it('trễ hạn → note "Trễ ..."', () => {
    const r = noteThoiGian({ ngayGioNhan: now - 20 * 60000, trangThai: 'moi' }, now)
    expect(r.muc).toBe('tre_han')
    expect(r.text).toBe('⏰ Trễ 20 phút')
  })
  it('sắp đến hạn → note "Còn ..."', () => {
    const r = noteThoiGian({ ngayGioNhan: now + 30 * 60000, trangThai: 'dang_lam' }, now)
    expect(r.muc).toBe('sap_den_han')
    expect(r.text).toBe('⏳ Còn 30 phút')
  })
  it('bình thường → không có note', () => {
    const r = noteThoiGian({ ngayGioNhan: now + 10 * 3600000, trangThai: 'moi' }, now)
    expect(r.muc).toBe('binh_thuong')
    expect(r.text).toBe('')
  })
  it('đơn đã hoàn tất dù quá giờ vẫn không báo động', () => {
    const r = noteThoiGian({ ngayGioNhan: now - 60 * 60000, trangThai: 'hoan_tat' }, now)
    expect(r.muc).toBe('binh_thuong')
    expect(r.text).toBe('')
  })
})
