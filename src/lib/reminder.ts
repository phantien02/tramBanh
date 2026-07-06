export const MOC_NHAC_NHO_MS = 2 * 60 * 60 * 1000

export function canNhacNho(
  don: { ngayGioNhan: number; trangThai: string; nhacNho: number },
  now: number,
): boolean {
  if (don.nhacNho) return false
  if (don.trangThai !== 'moi' && don.trangThai !== 'dang_lam') return false
  return don.ngayGioNhan - now <= MOC_NHAC_NHO_MS
}
