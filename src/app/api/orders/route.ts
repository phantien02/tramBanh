import { NextRequest, NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'
import { taoDon, layDanhSachDon } from '@/lib/orders-service'
import { laSdtVN } from '@/lib/phone'

export async function GET(req: NextRequest) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const sp = req.nextUrl.searchParams
  const orders = layDanhSachDon({
    tuNgay: sp.get('tu') ? Number(sp.get('tu')) : undefined,
    denNgay: sp.get('den') ? Number(sp.get('den')) : undefined,
    trangThai: sp.get('trangThai')?.split(',').filter(Boolean),
    q: sp.get('q') ?? undefined,
  })
  return NextResponse.json({ orders })
}

export async function POST(req: NextRequest) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  if (!['quay', 'quanly'].includes(user.vaiTro)) return loiJson(403, 'Chỉ quầy hoặc quản lý được tạo đơn')
  const data = await req.json()
  if (!data?.khach?.sdt || !data?.ngayGioNhan || !data?.items?.length) return loiJson(400, 'Thiếu thông tin bắt buộc')
  if (!(Number(data.tienCoc) > 0)) return loiJson(400, 'Vui lòng nhập tiền khách đã cọc (lớn hơn 0)')
  if (!laSdtVN(data.khach.sdt)) return loiJson(400, 'Số điện thoại khách không hợp lệ (số di động VN 10 chữ số)')
  if (data.hinhThucNhan === 'ship' && data.sdtNguoiNhan && !laSdtVN(data.sdtNguoiNhan)) return loiJson(400, 'Số điện thoại người nhận không hợp lệ')
  return NextResponse.json(taoDon(data, user.id), { status: 201 })
}
