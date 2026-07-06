import { NextRequest, NextResponse } from 'next/server'
import { docSession } from '@/lib/session'

const CONG_KHAI = ['/login', '/api/login']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (CONG_KHAI.some((p) => pathname.startsWith(p))) return NextResponse.next()

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
