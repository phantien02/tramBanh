import { describe, it, expect } from 'vitest'
import { chuyenHopLe } from './status'

describe('chuyenHopLe', () => {
  it('luồng chuẩn: moi→dang_lam (bếp), dang_lam→banh_xong (bếp), banh_xong→hoan_tat (quầy)', () => {
    expect(chuyenHopLe('moi', 'dang_lam', 'bep')).toBe(true)
    expect(chuyenHopLe('dang_lam', 'banh_xong', 'bep')).toBe(true)
    expect(chuyenHopLe('banh_xong', 'hoan_tat', 'quay')).toBe(true)
  })
  it('bỏ bước quầy nhận bánh: banh_xong→da_nhan không còn hợp lệ', () => {
    expect(chuyenHopLe('banh_xong', 'da_nhan', 'quay')).toBe(false)
    expect(chuyenHopLe('banh_xong', 'da_nhan', 'quanly')).toBe(false)
  })
  it('đơn cũ còn kẹt ở da_nhan vẫn kết thúc được', () => {
    expect(chuyenHopLe('da_nhan', 'hoan_tat', 'quay')).toBe(true)
  })
  it('đơn lấy ngay: quầy được moi→hoan_tat', () => {
    expect(chuyenHopLe('moi', 'hoan_tat', 'quay')).toBe(true)
  })
  it('sai vai trò thì bị chặn', () => {
    expect(chuyenHopLe('moi', 'dang_lam', 'quay')).toBe(false)
    expect(chuyenHopLe('banh_xong', 'hoan_tat', 'bep')).toBe(false)
  })
  it('không nhảy cóc', () => {
    expect(chuyenHopLe('moi', 'banh_xong', 'bep')).toBe(false)
    expect(chuyenHopLe('dang_lam', 'hoan_tat', 'quay')).toBe(false)
  })
  it('bếp hoàn tác được khi bấm nhầm: banh_xong→dang_lam, dang_lam→moi', () => {
    expect(chuyenHopLe('banh_xong', 'dang_lam', 'bep')).toBe(true)
    expect(chuyenHopLe('dang_lam', 'moi', 'bep')).toBe(true)
    expect(chuyenHopLe('banh_xong', 'dang_lam', 'quanly')).toBe(true)
  })
  it('không hoàn tác được sau khi đơn kết thúc hoặc sai vai trò', () => {
    expect(chuyenHopLe('da_nhan', 'banh_xong', 'bep')).toBe(false)
    expect(chuyenHopLe('da_nhan', 'dang_lam', 'quay')).toBe(false)
    expect(chuyenHopLe('banh_xong', 'dang_lam', 'quay')).toBe(false)
  })
  it('hủy: được từ mọi trạng thái trừ hoan_tat/huy, chỉ quầy hoặc quản lý', () => {
    expect(chuyenHopLe('moi', 'huy', 'quay')).toBe(true)
    expect(chuyenHopLe('banh_xong', 'huy', 'quanly')).toBe(true)
    expect(chuyenHopLe('hoan_tat', 'huy', 'quanly')).toBe(false)
    expect(chuyenHopLe('huy', 'huy', 'quanly')).toBe(false)
    expect(chuyenHopLe('moi', 'huy', 'bep')).toBe(false)
  })
  it('quản lý làm được mọi bước hợp lệ của quầy lẫn bếp', () => {
    expect(chuyenHopLe('moi', 'dang_lam', 'quanly')).toBe(true)
    expect(chuyenHopLe('banh_xong', 'hoan_tat', 'quanly')).toBe(true)
  })
  it('trạng thái kết thúc không chuyển tiếp được', () => {
    expect(chuyenHopLe('hoan_tat', 'moi', 'quanly')).toBe(false)
    expect(chuyenHopLe('huy', 'dang_lam', 'quanly')).toBe(false)
  })
})
