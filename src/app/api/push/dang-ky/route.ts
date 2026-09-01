import { NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'
import { luuDangKy, pushDaCauHinh } from '@/lib/push'

/**
 * Ghi nhận một máy muốn nhận thông báo.
 *
 * Client gọi lại API này mỗi lần mở app với đăng ký nó đang giữ, nên phải
 * gọi-lại-được — `luuDangKy` lo việc đó.
 */
export async function POST(req: Request) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  if (!pushDaCauHinh()) return loiJson(503, 'Máy chủ chưa cấu hình thông báo')

  const body = await req.json().catch(() => null)
  const endpoint: unknown = body?.endpoint
  const p256dh: unknown = body?.keys?.p256dh
  const auth: unknown = body?.keys?.auth
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return loiJson(400, 'Thiếu thông tin đăng ký')
  }

  luuDangKy(user.id, { endpoint, keys: { p256dh, auth } })
  return NextResponse.json({ ok: true })
}
