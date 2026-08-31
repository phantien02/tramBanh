import { NextRequest, NextResponse } from 'next/server'
import { docSession } from '@/lib/session'

// Đường dẫn mở cho người CHƯA đăng nhập. Khớp CHÍNH XÁC, không theo tiền tố:
// `startsWith` từng khiến mọi đường dẫn ăn theo (vd `/login-gia-mao`) cũng lọt vào đây.
// Ba file .html là tài liệu tĩnh trong `public/` — HDSD và 2 phiếu kiểm thử, cố ý để mở.
const CONG_KHAI = new Set([
  '/login',
  '/api/login',
  '/logo.svg',
  '/huong-dan.html',
  '/kiem-thu-ky-thuat.html',
  '/kiem-thu-nhan-vien.html',
])

export function laCongKhai(pathname: string) {
  return CONG_KHAI.has(pathname)
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (laCongKhai(pathname)) return NextResponse.next()

  const user = await docSession(req.cookies.get('session')?.value)
  if (!user) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const cam =
    (pathname.startsWith('/quanly') && user.vaiTro !== 'quanly') ||
    (pathname.startsWith('/bep') && !['bep', 'quanly'].includes(user.vaiTro)) ||
    (pathname.startsWith('/quay') && !['quay', 'quanly'].includes(user.vaiTro))
  if (cam) return NextResponse.redirect(new URL('/', req.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}
