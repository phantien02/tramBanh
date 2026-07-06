import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const sdt = req.nextUrl.searchParams.get('sdt') ?? ''
  const khach = db.select().from(customers).where(eq(customers.sdt, sdt)).get()
  return NextResponse.json(khach ?? null)
}
