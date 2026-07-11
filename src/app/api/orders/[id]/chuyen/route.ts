import { NextRequest, NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'
import { chuyenTrangThai } from '@/lib/orders-service'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const { to, ketThucKieu, lyDoHuy, anhThanhPham } = await req.json()
  const kq = chuyenTrangThai(Number((await params).id), to, user, {
    ketThucKieu, lyDoHuy,
    anhThanhPham: Array.isArray(anhThanhPham) ? anhThanhPham.filter((f) => typeof f === 'string') : undefined,
  })
  return kq.ok ? NextResponse.json({ ok: true }) : loiJson(409, kq.loi)
}
