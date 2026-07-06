import { NextRequest, NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'
import { xacNhanSua } from '@/lib/orders-service'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  if (!['bep', 'quanly'].includes(user.vaiTro)) return loiJson(403, 'Chỉ bếp xác nhận')
  xacNhanSua(Number((await params).id), user.id)
  return NextResponse.json({ ok: true })
}
