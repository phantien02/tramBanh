export function tinhTongTien(items: { gia: number; soLuong: number }[], phiShip: number): number {
  return items.reduce((s, i) => s + i.gia * i.soLuong, 0) + phiShip
}

export function tinhConLai(tongTien: number, tienCoc: number): number {
  return Math.max(0, tongTien - tienCoc)
}
