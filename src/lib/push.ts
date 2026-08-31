import { and, eq, inArray } from 'drizzle-orm'
import webpush from 'web-push'
import { db } from '@/db'
import { customers, orders, pushSubscriptions, users } from '@/db/schema'
import { dinhTuyen, type NoiDungPush, type VaiTro } from './push-routing'
import type { SuKien } from './sse'

export type DangKy = {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

/** Gửi tới đúng một máy. Tách ra thành tham số để test khỏi phải gọi mạng thật. */
export type GuiMot = (dk: DangKy, payload: string) => Promise<void>

/**
 * Thiếu khóa VAPID thì toàn bộ tầng push nằm im: app chạy y như chưa có tính năng
 * này. Cố ý như vậy để deploy được lên máy chủ chưa cấu hình mà không vỡ gì.
 */
export function pushDaCauHinh(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function khoaCongKhai(): string | null {
  return pushDaCauHinh() ? process.env.VAPID_PUBLIC_KEY! : null
}

/**
 * Lấy các máy cần gửi. Join sang `users` để lọc theo vai trò và bỏ nhân viên đã
 * bị khóa — vai trò không lưu trùng bên bảng đăng ký, xem ghi chú ở schema.
 */
export function layDangKyTheoVaiTro(vaiTro: readonly VaiTro[]): DangKy[] {
  if (vaiTro.length === 0) return []
  return db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(and(inArray(users.vaiTro, [...vaiTro]), eq(users.active, 1)))
    .all()
}

/**
 * Gửi tới tất cả các máy, không để một máy hỏng chặn các máy còn lại.
 *
 * 404/410 = trình duyệt báo endpoint này chết hẳn (nhân viên gỡ app, xóa dữ liệu
 * trình duyệt) → xóa khỏi DB, không thì bảng phình mãi và mỗi lần gửi lại chậm
 * thêm. Các lỗi khác (mạng, 5xx) chỉ là tạm thời → GIỮ lại, lần sau gửi tiếp.
 */
export async function guiToiCacMay(
  dsDangKy: DangKy[],
  noiDung: NoiDungPush,
  guiMot: GuiMot,
): Promise<{ thanhCong: number; daXoa: number }> {
  const payload = JSON.stringify({
    tieuDe: noiDung.tieuDe,
    noiDung: noiDung.noiDung,
    duongDan: noiDung.duongDan,
  })

  const ketQua = await Promise.all(
    dsDangKy.map(async (dk) => {
      try {
        await guiMot(dk, payload)
        return 'ok' as const
      } catch (e) {
        const ma = (e as { statusCode?: number }).statusCode
        if (ma === 404 || ma === 410) {
          db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, dk.id)).run()
          return 'chet' as const
        }
        return 'loi' as const
      }
    }),
  )

  return {
    thanhCong: ketQua.filter((r) => r === 'ok').length,
    daXoa: ketQua.filter((r) => r === 'chet').length,
  }
}

const guiThat: GuiMot = async (dk, payload) => {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@tram-banh.local',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  await webpush.sendNotification(
    { endpoint: dk.endpoint, keys: { p256dh: dk.p256dh, auth: dk.auth } },
    payload,
  )
}

function thongTinDon(orderId: number) {
  const r = db
    .select({ tenKhach: customers.ten, gioGiao: orders.ngayGioNhan })
    .from(orders)
    .leftJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, orderId))
    .get()
  return { tenKhach: r?.tenKhach ?? null, gioGiao: r?.gioGiao ?? null }
}

/**
 * Điểm nối duy nhất với `phatSuKien()`. Không bao giờ ném lỗi ra ngoài: việc tạo
 * đơn tuyệt đối không được hỏng chỉ vì thông báo không gửi được.
 */
export async function guiPushChoSuKien(e: SuKien, guiMot: GuiMot = guiThat): Promise<void> {
  try {
    if (!pushDaCauHinh()) return
    const noiDung = dinhTuyen(e, thongTinDon(e.orderId))
    if (!noiDung) return
    await guiToiCacMay(layDangKyTheoVaiTro(noiDung.vaiTro), noiDung, guiMot)
  } catch (err) {
    console.error('[push] gửi thất bại:', err)
  }
}
