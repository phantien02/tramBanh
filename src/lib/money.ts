export function tinhTongTien(
  items: { gia: number; soLuong: number }[],
  phiShip: number,
  phuKien: { gia: number; soLuong: number }[] = [],
): number {
  const cong = (s: number, i: { gia: number; soLuong: number }) => s + i.gia * i.soLuong
  return items.reduce(cong, 0) + phuKien.reduce(cong, 0) + phiShip
}

export function tinhConLai(tongTien: number, tienCoc: number): number {
  return Math.max(0, tongTien - tienCoc)
}

// ===== Giá món = giá base + phụ thu theo cốt/mứt/topping =====
// Base do NV nhập (đã gồm cốt Vanilla + mứt Chanh Leo + mọi lựa chọn miễn phí).
// Mỗi vị có thể phụ thu theo % (tính trên base) hoặc tiền cố định; % làm tròn 1.000đ.

export type PhuThuKieu = 'phan_tram' | 'tien' | null
export type ViPhuThu = { loai: string; ten: string; phuThuKieu: PhuThuKieu; phuThuGiaTri: number }
export type LuaChonVi = { cot?: string | null; mut?: string | null; topping?: string[] }

const lamTronNghin = (x: number) => Math.round(x / 1000) * 1000

// Số tiền phụ thu của MỘT vị dựa trên giá base
export function phuThuVi(base: number, opt: ViPhuThu | undefined): number {
  if (!opt || !opt.phuThuKieu || opt.phuThuGiaTri <= 0) return 0
  if (opt.phuThuKieu === 'tien') return opt.phuThuGiaTri
  return lamTronNghin((base * opt.phuThuGiaTri) / 100)
}

// Phân tích giá 1 món: base + danh sách phụ thu (bỏ qua vị không có trong danh mục) → tổng
export function phanTichGiaMon(base: number, chon: LuaChonVi, dsOpt: ViPhuThu[]): {
  base: number
  phuThu: { loai: string; ten: string; tien: number }[]
  tong: number
} {
  const phuThu: { loai: string; ten: string; tien: number }[] = []
  const them = (loai: string, ten: string | null | undefined) => {
    if (!ten) return
    const tien = phuThuVi(base, dsOpt.find((o) => o.loai === loai && o.ten === ten))
    if (tien > 0) phuThu.push({ loai, ten, tien })
  }
  them('cot', chon.cot)
  them('mut', chon.mut)
  ;(chon.topping ?? []).forEach((t) => them('topping', t))
  const tong = base + phuThu.reduce((s, x) => s + x.tien, 0)
  return { base, phuThu, tong }
}

export function tinhGiaMon(base: number, chon: LuaChonVi, dsOpt: ViPhuThu[]): number {
  return phanTichGiaMon(base, chon, dsOpt).tong
}
