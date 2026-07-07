import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { banhOptions, products } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'
import { SAN_PHAM_MAU } from '@/lib/seed-const'

type Loai = 'cot' | 'mut' | 'topping' | 'size'
const LOAI: Loai[] = ['cot', 'mut', 'topping', 'size']

export async function GET() {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const all = db.select().from(banhOptions).orderBy(asc(banhOptions.thuTu), asc(banhOptions.id)).all()
  const nhom: Record<Loai, typeof all> = { cot: [], mut: [], topping: [], size: [] }
  for (const o of all) nhom[o.loai as Loai].push(o)
  const sp = db.select().from(products).where(eq(products.ten, SAN_PHAM_MAU)).get()
  return NextResponse.json({ ...nhom, sanPhamMau: sp ? { id: sp.id, ten: sp.ten } : null })
}

export async function POST(req: NextRequest) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const { loai, ten } = await req.json()
  if (!LOAI.includes(loai) || !ten?.trim()) return loiJson(400, 'Thiếu loại hoặc tên vị')
  const max = db.select().from(banhOptions).where(eq(banhOptions.loai, loai)).all()
    .reduce((m, o) => Math.max(m, o.thuTu), -1)
  const row = db.insert(banhOptions).values({ loai, ten: ten.trim(), thuTu: max + 1 }).returning().get()
  return NextResponse.json({ id: row.id }, { status: 201 })
}
