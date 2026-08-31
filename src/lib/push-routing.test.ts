import { describe, expect, it } from 'vitest'
import { dinhTuyen } from './push-routing'

const don = { tenKhach: 'chị Lan', gioGiao: new Date('2026-08-31T15:00:00+07:00').getTime() }

describe('dinhTuyen', () => {
  it('đơn mới → bếp (và quản lý)', () => {
    const kq = dinhTuyen({ type: 'don_moi', orderId: 7, maDon: '#3108-02' }, don)
    expect(kq?.vaiTro).toEqual(['bep', 'quanly'])
    expect(kq?.tieuDe).toContain('Đơn mới')
    expect(kq?.noiDung).toContain('#3108-02')
    expect(kq?.noiDung).toContain('chị Lan')
    expect(kq?.noiDung).toContain('15:00')
  })

  it('bánh xong → quầy (và quản lý)', () => {
    const kq = dinhTuyen(
      { type: 'chuyen_trang_thai', orderId: 7, maDon: '#3108-02', trangThai: 'banh_xong' },
      don,
    )
    expect(kq?.vaiTro).toEqual(['quay', 'quanly'])
    expect(kq?.tieuDe).toContain('Bánh xong')
  })

  it('nhắc nhở → bếp (và quản lý)', () => {
    const kq = dinhTuyen({ type: 'nhac_nho', orderId: 7, maDon: '#3108-02' }, don)
    expect(kq?.vaiTro).toEqual(['bep', 'quanly'])
    expect(kq?.tieuDe).toMatch(/sắp|giờ giao/i)
  })

  it('đơn được sửa → bếp (và quản lý)', () => {
    const kq = dinhTuyen({ type: 'don_cap_nhat', orderId: 7, maDon: '#3108-02' }, don)
    expect(kq?.vaiTro).toEqual(['bep', 'quanly'])
    expect(kq?.tieuDe).toMatch(/sửa/i)
  })

  it('chuyển sang trạng thái khác thì KHÔNG làm phiền ai', () => {
    for (const tt of ['dang_lam', 'da_nhan', 'hoan_tat', 'huy']) {
      expect(dinhTuyen({ type: 'chuyen_trang_thai', orderId: 7, maDon: '#3108-02', trangThai: tt }, don)).toBeNull()
    }
  })

  it('thiếu tên khách thì vẫn gửi được, chỉ bỏ phần tên', () => {
    const kq = dinhTuyen({ type: 'don_moi', orderId: 7, maDon: '#3108-02' }, { tenKhach: null, gioGiao: null })
    expect(kq).not.toBeNull()
    expect(kq?.noiDung).toContain('#3108-02')
    expect(kq?.noiDung).not.toContain('—  —')
  })

  it('kèm đường dẫn để bấm vào thông báo là mở đúng đơn', () => {
    expect(dinhTuyen({ type: 'don_moi', orderId: 7, maDon: '#3108-02' }, don)?.duongDan).toBe('/quay/don/7')
  })
})
