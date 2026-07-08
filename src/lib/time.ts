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

// "15 phút", "2h15", "3 giờ" — dùng cho note trễ giờ / còn bao lâu
export function dinhDangKhoang(ms: number): string {
  const phut = Math.max(0, Math.round(ms / 60000))
  if (phut < 60) return `${phut} phút`
  const gio = Math.floor(phut / 60)
  const du = phut % 60
  return du ? `${gio}h${String(du).padStart(2, '0')}` : `${gio} giờ`
}

// Note thời gian hiển thị trên thẻ đơn: trễ bao lâu / còn bao lâu tới giờ giao
export function noteThoiGian(
  don: { ngayGioNhan: number; trangThai: string },
  now: number,
): { muc: 'binh_thuong' | 'sap_den_han' | 'tre_han'; text: string } {
  const muc = mucCanhBao(don, now)
  if (muc === 'tre_han') return { muc, text: `⏰ Trễ ${dinhDangKhoang(now - don.ngayGioNhan)}` }
  if (muc === 'sap_den_han') return { muc, text: `⏳ Còn ${dinhDangKhoang(don.ngayGioNhan - now)}` }
  return { muc, text: '' }
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
