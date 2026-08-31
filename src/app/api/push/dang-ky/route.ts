import { NextResponse } from 'next/server'
import { db } from '@/db'
import { pushSubscriptions } from '@/db/schema'
import { layUser, loiJson } from '@/lib/api-helpers'
import { pushDaCauHinh } from '@/lib/push'

/** Ghi nhận một máy muốn nhận thông báo. Mỗi máy một dòng, khóa theo `endpoint`. */
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

  // Cùng một máy đăng ký lại (đổi tài khoản, bật lại) thì cập nhật chứ không tạo
  // dòng thừa — endpoint là định danh duy nhất của máy đó.
  db.insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth, taoLuc: Date.now() })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh, auth, taoLuc: Date.now() },
    })
    .run()

  return NextResponse.json({ ok: true })
}
