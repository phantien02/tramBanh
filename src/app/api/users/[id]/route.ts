import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
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
