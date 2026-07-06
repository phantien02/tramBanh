import { SignJWT, jwtVerify } from 'jose'
import type { VaiTro } from './status'

export type SessionUser = { id: number; username: string; hoTen: string; vaiTro: VaiTro }

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('Thiếu biến môi trường SESSION_SECRET — bắt buộc khi chạy production để bảo mật phiên đăng nhập')
}

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? 'dev-secret-thay-toi-khi-deploy')

export async function taoSessionCookie(user: SessionUser): Promise<string> {
  return new SignJWT(user as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret())
}

export async function docSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return { id: payload.id, username: payload.username, hoTen: payload.hoTen, vaiTro: payload.vaiTro } as SessionUser
  } catch {
    return null
  }
}
