import { NextRequest, NextResponse } from 'next/server'
import { eq, or } from 'drizzle-orm'
import { db } from '@/db'
import { users, orders, orderEvents } from '@/db/schema'
import { hashPassword } from '@/lib/auth'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const id = Number((await params).id)
  const { hoTen, vaiTro, active, password } = await req.json()
  const set: Record<string, unknown> = {}
  if (hoTen !== undefined) set.hoTen = hoTen
  if (vaiTro !== undefined) set.vaiTro = vaiTro
  if (active !== undefined) set.active = active ? 1 : 0
  if (password) set.passwordHash = hashPassword(password)
  if (Object.keys(set).length) db.update(users).set(set).where(eq(users.id, id)).run()
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const id = Number((await params).id)
  if (id === user.id) return loiJson(400, 'Không thể tự xóa tài khoản đang đăng nhập')
  const muc = db.select().from(users).where(eq(users.id, id)).get()
  if (!muc) return loiJson(404, 'Không tìm thấy tài khoản')
  if (muc.username === 'admin') return loiJson(400, 'Không thể xóa tài khoản admin gốc')
  const coDon = db.select({ id: orders.id }).from(orders)
    .where(or(eq(orders.nguoiTao, id), eq(orders.nguoiLam, id), eq(orders.nguoiGiao, id)))
    .limit(1).get()
    ?? db.select({ id: orderEvents.id }).from(orderEvents).where(eq(orderEvents.userId, id)).limit(1).get()
  if (coDon) return loiJson(409, 'Nhân viên đã có lịch sử đơn hàng, không thể xóa — hãy khóa tài khoản thay thế')
  db.delete(users).where(eq(users.id, id)).run()
  return NextResponse.json({ ok: true })
}
