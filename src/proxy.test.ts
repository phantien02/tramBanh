import { describe, expect, it } from 'vitest'
import { laCongKhai } from './proxy'

describe('laCongKhai', () => {
  it.each([
    '/login',
    '/api/login',
    '/logo.svg',
    // Ba file tĩnh trong public/: HDSD và 2 phiếu kiểm thử, cố ý mở cho người chưa đăng nhập.
    '/huong-dan.html',
    '/kiem-thu-ky-thuat.html',
    '/kiem-thu-nhan-vien.html',
    // PWA: trinh duyet nap nhung file nay o nhung boi canh khong chac co cookie
    // phien (dang ky service worker, cai vao man hinh chinh). Chung khong chua gi
    // rieng tu, mo ra la dung.
    '/manifest.json',
    '/sw.js',
    '/icon-192.png',
    '/icon-512.png',
    '/icon-512-maskable.png',
  ])('cho qua %s', (p) => {
    expect(laCongKhai(p)).toBe(true)
  })

  it.each([
    '/',
    '/quay',
    '/bep',
    '/quanly',
    '/api/orders',
  ])('chặn %s', (p) => {
    expect(laCongKhai(p)).toBe(false)
  })

  it('không cho đường dẫn lạ ăn theo tiền tố của mục công khai', () => {
    expect(laCongKhai('/login-gia-mao')).toBe(false)
    expect(laCongKhai('/kiem-thu-noi-bo.html')).toBe(false)
    expect(laCongKhai('/api/login-khac')).toBe(false)
  })
})
