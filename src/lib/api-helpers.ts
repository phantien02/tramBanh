import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { docSession, type SessionUser } from './session'

export async function layUser(): Promise<SessionUser | null> {
  const c = await cookies()
  const phien = await docSession(c.get('session')?.value)
  if (!phien) return null
  // tra lại DB đồng bộ — khóa tài khoản / đổi vai trò có hiệu lực ngay, không chờ hết hạn JWT
  const row = db.select().from(users).where(eq(users.id, phien.id)).get()
  if (!row || row.active !== 1) return null
  return { id: row.id, username: row.username, hoTen: row.hoTen, vaiTro: row.vaiTro }
}

export function loiJson(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}
