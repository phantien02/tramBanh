import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, sqlite } from '@/db'
import { products, productSizes } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const id = Number((await params).id)
  const { ten, nhom, anh, active, sizes } = await req.json()
  const set: Record<string, unknown> = {}
  if (ten !== undefined) set.ten = ten
  if (nhom !== undefined) set.nhom = nhom
  if (anh !== undefined) set.anh = anh
  if (active !== undefined) set.active = active ? 1 : 0

  sqlite.transaction(() => {
    if (Object.keys(set).length) db.update(products).set(set).where(eq(products.id, id)).run()
    if (sizes) {
      db.delete(productSizes).where(eq(productSizes.productId, id)).run()
      for (const s of sizes) db.insert(productSizes).values({ productId: id, tenCo: s.tenCo, gia: s.gia }).run()
    }
  })()

  return NextResponse.json({ ok: true })
}
