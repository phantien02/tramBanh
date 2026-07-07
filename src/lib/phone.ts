// Kiểm tra & chuẩn hoá số điện thoại Việt Nam

// Bỏ khoảng trắng, dấu chấm, gạch; đổi +84 / 84 đầu số về 0
export function chuanHoaSdt(raw: string): string {
  let s = (raw ?? '').replace(/[\s.\-()]/g, '')
  if (s.startsWith('+84')) s = '0' + s.slice(3)
  else if (s.startsWith('84') && s.length >= 11) s = '0' + s.slice(2)
  return s
}

// Di động VN: 10 số, bắt đầu 0, đầu số nhà mạng 03/05/07/08/09
const RE_DI_DONG = /^0(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/

export function laSdtVN(raw: string): boolean {
  return RE_DI_DONG.test(chuanHoaSdt(raw))
}
