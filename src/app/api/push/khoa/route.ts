import { NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'
import { khoaCongKhai } from '@/lib/push'

/**
 * Trả khóa công khai VAPID cho trình duyệt đăng ký nhận thông báo.
 * `khoa: null` = máy chủ chưa cấu hình → giao diện ẩn luôn nút "Bật thông báo",
 * để không ai bấm vào một cái nút chẳng làm được gì.
 */
export async function GET() {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  return NextResponse.json({ khoa: khoaCongKhai() })
}
