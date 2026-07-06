import { NextRequest, NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'
import { layChiTietDon, suaDon } from '@/lib/orders-service'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const don = layChiTietDon(Number((await params).id))
  return don ? NextResponse.json(don) : loiJson(404, 'Không tìm thấy đơn')
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  if (!['quay', 'quanly'].includes(user.vaiTro)) return loiJson(403, 'Không có quyền sửa đơn')
  const kq = suaDon(Number((await params).id), await req.json(), user.id)
  return kq.ok ? NextResponse.json({ ok: true }) : loiJson(409, kq.loi!)
}
