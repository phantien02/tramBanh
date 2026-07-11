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
