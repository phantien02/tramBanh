import { MOC_NHAC_NHO_MS } from './reminder'

export function dauCuoiNgay(d: Date): { dau: number; cuoi: number } {
  const dau = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime()
  const cuoi = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()
  return { dau, cuoi }
}

export function mucCanhBao(
  don: { ngayGioNhan: number; trangThai: string },
  now: number,
): 'binh_thuong' | 'sap_den_han' | 'tre_han' {
  if (don.trangThai === 'hoan_tat' || don.trangThai === 'huy') return 'binh_thuong'
  if (now > don.ngayGioNhan) return 'tre_han'
  if (don.ngayGioNhan - now <= MOC_NHAC_NHO_MS) return 'sap_den_han'
  return 'binh_thuong'
}

export function dinhDangGio(ms: number): string {
  return new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function dinhDangNgay(ms: number): string {
  return new Date(ms).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function dinhDangTien(vnd: number): string {
  return vnd.toLocaleString('vi-VN') + 'đ'
}
