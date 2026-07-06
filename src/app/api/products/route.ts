import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products, productSizes } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function GET() {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const ds = db.select().from(products).all().map((p) => ({
    ...p,
    sizes: db.select().from(productSizes).where(eq(productSizes.productId, p.id)).all(),
  }))
  return NextResponse.json({ products: ds })
}

export async function POST(req: NextRequest) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const { ten, nhom, anh, sizes } = await req.json()
  if (!ten || !sizes?.length) return loiJson(400, 'Thiếu tên hoặc cỡ bánh')
  const p = db.insert(products).values({ ten, nhom: nhom || 'Khác', anh }).returning().get()
  for (const s of sizes) db.insert(productSizes).values({ productId: p.id, tenCo: s.tenCo, gia: s.gia }).run()
  return NextResponse.json({ id: p.id }, { status: 201 })
}
