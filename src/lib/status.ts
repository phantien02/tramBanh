export type TrangThai = 'moi' | 'dang_lam' | 'banh_xong' | 'da_nhan' | 'hoan_tat' | 'huy'
export type VaiTro = 'quay' | 'bep' | 'quanly'

export const TEN_TRANG_THAI: Record<TrangThai, string> = {
  moi: 'Mới tạo',
  dang_lam: 'Bếp đang làm',
  banh_xong: 'Bánh xong',
  da_nhan: 'Quầy đã nhận',
  hoan_tat: 'Hoàn tất',
  huy: 'Đã hủy',
}

// các bước chuyển hợp lệ + vai trò được bấm (quanly luôn được)
const BUOC: { from: TrangThai; to: TrangThai; roles: VaiTro[] }[] = [
  { from: 'moi', to: 'dang_lam', roles: ['bep'] },
  { from: 'moi', to: 'hoan_tat', roles: ['quay'] },      // đơn lấy ngay
  { from: 'dang_lam', to: 'banh_xong', roles: ['bep'] },
  { from: 'banh_xong', to: 'hoan_tat', roles: ['quay'] }, // bánh xong → giao thẳng, bỏ bước quầy nhận
  { from: 'da_nhan', to: 'hoan_tat', roles: ['quay'] },   // đơn cũ còn kẹt ở "Quầy đã nhận" vẫn kết thúc được
  // hoàn tác khi bếp bấm nhầm — chỉ được trước khi đơn kết thúc
  { from: 'banh_xong', to: 'dang_lam', roles: ['bep'] }, // lỡ bấm "Xong"
  { from: 'dang_lam', to: 'moi', roles: ['bep'] },       // trả về hàng chờ
]

export function chuyenHopLe(from: TrangThai, to: TrangThai, vaiTro: VaiTro): boolean {
  if (to === 'huy') {
    return from !== 'hoan_tat' && from !== 'huy' && (vaiTro === 'quay' || vaiTro === 'quanly')
  }
  const buoc = BUOC.find((b) => b.from === from && b.to === to)
  if (!buoc) return false
  return vaiTro === 'quanly' || buoc.roles.includes(vaiTro)
}
