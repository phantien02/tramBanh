import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { pushSubscriptions } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'

/** Tắt thông báo trên đúng máy này. */
export async function POST(req: Request) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')

  const body = await req.json().catch(() => null)
  const endpoint: unknown = body?.endpoint
  if (typeof endpoint !== 'string') return loiJson(400, 'Thiếu endpoint')

  db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run()
  return NextResponse.json({ ok: true })
}
