import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { verifyPassword } from '@/lib/auth'
import { taoSessionCookie } from '@/lib/session'
import { loiJson } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  // trim() để bỏ khoảng trắng thừa (bàn phím mobile hay tự thêm dấu cách/đầu-cuối)
  const tenDangNhap = String(username ?? '').trim()
  const user = db.select().from(users).where(eq(users.username, tenDangNhap)).get()
  if (!user || !user.active || !verifyPassword(String(password ?? ''), user.passwordHash)) {
    return loiJson(401, 'Sai tên đăng nhập hoặc mật khẩu')
  }
  const token = await taoSessionCookie({ id: user.id, username: user.username, hoTen: user.hoTen, vaiTro: user.vaiTro })
  const res = NextResponse.json({ vaiTro: user.vaiTro })
  res.cookies.set('session', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 3600 })
  return res
}
