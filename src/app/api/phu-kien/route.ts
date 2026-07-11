import { NextRequest, NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { phuKien } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function GET() {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const items = db.select().from(phuKien).orderBy(asc(phuKien.thuTu), asc(phuKien.id)).all()
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const { ten, gia } = await req.json()
  if (!ten?.trim()) return loiJson(400, 'Thiếu tên phụ kiện')
  if (!(Number(gia) >= 0)) return loiJson(400, 'Giá phụ kiện không hợp lệ')
  const max = db.select().from(phuKien).all().reduce((m, o) => Math.max(m, o.thuTu), -1)
  const row = db.insert(phuKien).values({ ten: ten.trim(), gia: Number(gia), thuTu: max + 1 }).returning().get()
  return NextResponse.json({ id: row.id }, { status: 201 })
}
