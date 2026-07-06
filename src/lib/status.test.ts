import { describe, it, expect } from 'vitest'
import { chuyenHopLe } from './status'

describe('chuyenHopLe', () => {
  it('luồng chuẩn: moi→dang_lam (bếp), dang_lam→banh_xong (bếp), banh_xong→da_nhan (quầy), da_nhan→hoan_tat (quầy)', () => {
    expect(chuyenHopLe('moi', 'dang_lam', 'bep')).toBe(true)
    expect(chuyenHopLe('dang_lam', 'banh_xong', 'bep')).toBe(true)
    expect(chuyenHopLe('banh_xong', 'da_nhan', 'quay')).toBe(true)
    expect(chuyenHopLe('da_nhan', 'hoan_tat', 'quay')).toBe(true)
  })
  it('đơn lấy ngay: quầy được moi→hoan_tat', () => {
    expect(chuyenHopLe('moi', 'hoan_tat', 'quay')).toBe(true)
  })
  it('sai vai trò thì bị chặn', () => {
    expect(chuyenHopLe('moi', 'dang_lam', 'quay')).toBe(false)
    expect(chuyenHopLe('banh_xong', 'da_nhan', 'bep')).toBe(false)
  })
  it('không nhảy cóc', () => {
    expect(chuyenHopLe('moi', 'banh_xong', 'bep')).toBe(false)
    expect(chuyenHopLe('dang_lam', 'da_nhan', 'quay')).toBe(false)
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
    expect(chuyenHopLe('banh_xong', 'da_nhan', 'quanly')).toBe(true)
  })
  it('trạng thái kết thúc không chuyển tiếp được', () => {
    expect(chuyenHopLe('hoan_tat', 'moi', 'quanly')).toBe(false)
    expect(chuyenHopLe('huy', 'dang_lam', 'quanly')).toBe(false)
  })
})
