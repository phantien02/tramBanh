import { NextRequest, NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'
import { tinhThongKe } from '@/lib/thong-ke'

export async function GET(req: NextRequest) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const sp = req.nextUrl.searchParams
  return NextResponse.json(tinhThongKe(Number(sp.get('tu')), Number(sp.get('den'))))
}
