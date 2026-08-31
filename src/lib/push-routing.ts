import type { SuKien } from './sse'

export type VaiTro = 'quay' | 'bep' | 'quanly'

export type ThongTinDon = {
  tenKhach?: string | null
  gioGiao?: number | null
}

export type NoiDungPush = {
  vaiTro: VaiTro[]
  tieuDe: string
  noiDung: string
  duongDan: string
}

function gioPhut(moc?: number | null) {
  if (!moc) return null
  const d = new Date(moc)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Ghép các mẩu có thật, bỏ mẩu rỗng — tránh ra chuỗi kiểu "#3108-02 —  — ". */
function ghep(...manh: (string | null | undefined)[]) {
  return manh.filter(Boolean).join(' — ')
}

/**
 * Quyết định một sự kiện có đáng gửi thông báo đẩy không, gửi cho vai trò nào,
 * và hiện chữ gì trên màn hình khóa.
 *
 * Hàm thuần, không đụng DB — mọi thứ cần biết đều truyền vào. Nhờ vậy test được
 * toàn bộ luật định tuyến mà không cần dựng dữ liệu.
 *
 * Trả `null` = không làm phiền ai. Mặc định là im lặng: chỉ những sự kiện mà
 * người nhận PHẢI LÀM GÌ ĐÓ mới được rung máy. Thông báo không dẫn tới hành động
 * sẽ dạy người ta bỏ qua thông báo.
 */
export function dinhTuyen(e: SuKien, don: ThongTinDon): NoiDungPush | null {
  const gio = gioPhut(don.gioGiao)
  const khach = don.tenKhach?.trim() || null
  const duongDan = `/quay/don/${e.orderId}`

  switch (e.type) {
    case 'don_moi':
      return {
        vaiTro: ['bep', 'quanly'],
        tieuDe: 'Đơn mới',
        noiDung: ghep(e.maDon, khach, gio && `giao ${gio}`),
        duongDan,
      }

    case 'chuyen_trang_thai':
      // Chỉ "bánh xong" mới cần báo — quầy phải ra giao khách. Các bước còn lại
      // (đang làm, đã giao, hủy) là việc nội bộ, không ai phải hành động vì nó.
      if (e.trangThai !== 'banh_xong') return null
      return {
        vaiTro: ['quay', 'quanly'],
        tieuDe: 'Bánh xong',
        noiDung: ghep(e.maDon, khach, gio && `giao ${gio}`),
        duongDan,
      }

    case 'nhac_nho':
      return {
        vaiTro: ['bep', 'quanly'],
        tieuDe: 'Sắp tới giờ giao',
        noiDung: ghep(e.maDon, khach, gio),
        duongDan,
      }

    case 'don_cap_nhat':
      return {
        vaiTro: ['bep', 'quanly'],
        tieuDe: 'Đơn vừa được sửa',
        noiDung: ghep(e.maDon, khach, gio && `giao ${gio}`),
        duongDan,
      }

    default:
      return null
  }
}
