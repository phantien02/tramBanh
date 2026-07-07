import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { banhOptions } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const { id } = await params
  const body = await req.json()
  const set: Record<string, unknown> = {}
  if (typeof body.ten === 'string' && body.ten.trim()) set.ten = body.ten.trim()
  if (typeof body.active === 'boolean') set.active = body.active ? 1 : 0
  if (typeof body.active === 'number') set.active = body.active
  if (typeof body.thuTu === 'number') set.thuTu = body.thuTu
  if (Object.keys(set).length === 0) return loiJson(400, 'Không có gì để cập nhật')
  db.update(banhOptions).set(set).where(eq(banhOptions.id, Number(id))).run()
  return NextResponse.json({ ok: true })
}
