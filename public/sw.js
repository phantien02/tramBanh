/* Service worker của Trạm Bánh — chỉ lo thông báo đẩy, KHÔNG cache gì.
   Cố ý không làm offline cache: dữ liệu đơn hàng phải luôn tươi, hiện bản cũ
   còn nguy hiểm hơn là báo mất mạng. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = {} }

  const tieuDe = d.tieuDe || 'Trạm Bánh'
  const duongDan = d.duongDan || '/'

  e.waitUntil(
    self.registration.showNotification(tieuDe, {
      body: d.noiDung || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'vi',
      // Gộp theo đường dẫn: nhiều lần cập nhật cùng một đơn thì thay thế thông
      // báo cũ thay vì xếp chồng một đống.
      tag: duongDan,
      renotify: true,
      data: { duongDan },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const duongDan = (e.notification.data && e.notification.data.duongDan) || '/'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ds) => {
      // Nếu app đang mở sẵn thì đưa đúng tab đó lên và điều hướng, đừng mở thêm
      // tab mới — nhân viên đang giữa chừng nhập đơn sẽ rất khó chịu.
      for (const c of ds) {
        if ('focus' in c) {
          c.navigate(duongDan)
          return c.focus()
        }
      }
      return self.clients.openWindow(duongDan)
    }),
  )
})
