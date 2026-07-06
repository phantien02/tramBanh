export function taoMaDon(ngay: Date, soThuTuTrongNgay: number): string {
  const dd = String(ngay.getDate()).padStart(2, '0')
  const mm = String(ngay.getMonth() + 1).padStart(2, '0')
  const nn = String(soThuTuTrongNgay).padStart(2, '0')
  return `#${dd}${mm}-${nn}`
}
