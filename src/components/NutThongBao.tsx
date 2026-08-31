'use client'
import { useEffect, useState } from 'react'

/** Chuỗi base64url của khóa VAPID → Uint8Array cho pushManager. */
function doiKhoa(base64url: string) {
  const dem = '='.repeat((4 - (base64url.length % 4)) % 4)
  const b64 = (base64url + dem).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

function laIOS() {
  if (typeof navigator === 'undefined') return false
  // iPad đời mới khai user agent giống máy Mac, phải nhận thêm bằng cảm ứng.
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function daCaiVaoManHinhChinh() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

type TrangThai = 'dangKiemTra' | 'khongHoTro' | 'canCaiTruoc' | 'tat' | 'bat' | 'biChan'

export default function NutThongBao() {
  const [tt, setTt] = useState<TrangThai>('dangKiemTra')
  const [khoa, setKhoa] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)
  const [moHuongDan, setMoHuongDan] = useState(false)

  useEffect(() => {
    let huy = false
    ;(async () => {
      // Máy chủ chưa cấu hình VAPID thì ẩn hẳn nút, đừng cho bấm vào chỗ trống.
      const r = await fetch('/api/push/khoa').catch(() => null)
      const kq = r?.ok ? await r.json().catch(() => null) : null
      if (huy) return
      if (!kq?.khoa) return setTt('khongHoTro')
      setKhoa(kq.khoa)

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // Trên iOS, Safari thường KHÔNG có PushManager — phải cài vào màn hình
        // chính trước. Phân biệt hai ca này để hướng dẫn cho đúng.
        return setTt(laIOS() && !daCaiVaoManHinhChinh() ? 'canCaiTruoc' : 'khongHoTro')
      }
      if (laIOS() && !daCaiVaoManHinhChinh()) return setTt('canCaiTruoc')
      if (Notification.permission === 'denied') return setTt('biChan')

      const dk = await navigator.serviceWorker.getRegistration()
      const sub = await dk?.pushManager.getSubscription()
      setTt(sub ? 'bat' : 'tat')
    })()
    return () => {
      huy = true
    }
  }, [])

  async function bat() {
    if (!khoa) return
    setDangXuLy(true)
    try {
      const quyen = await Notification.requestPermission()
      if (quyen !== 'granted') return setTt(quyen === 'denied' ? 'biChan' : 'tat')

      const dk = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await dk.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: doiKhoa(khoa),
      })
      const r = await fetch('/api/push/dang-ky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      setTt(r.ok ? 'bat' : 'tat')
    } catch {
      setTt('tat')
    } finally {
      setDangXuLy(false)
    }
  }

  async function tat() {
    setDangXuLy(true)
    try {
      const dk = await navigator.serviceWorker.getRegistration()
      const sub = await dk?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/huy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setTt('tat')
    } finally {
      setDangXuLy(false)
    }
  }

  if (tt === 'dangKiemTra' || tt === 'khongHoTro') return null

  const kieuNut =
    'text-sm px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50'
  const nen = { background: 'rgba(255,255,255,.06)' }

  if (tt === 'canCaiTruoc') {
    return (
      <>
        <button onClick={() => setMoHuongDan(true)} className={kieuNut} style={nen}
          title="Cần thêm vào Màn hình chính trước">
          🔔 Bật thông báo
        </button>
        {moHuongDan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setMoHuongDan(false)}>
            <div className="tb-card max-w-sm w-full p-5 text-[var(--color-caphe)]"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-xl font-semibold mb-2">Thêm vào Màn hình chính trước</h3>
              <p className="text-sm mb-3">
                iPhone và iPad chỉ cho nhận thông báo khi app đã được thêm vào Màn hình
                chính. Đây là quy định của Apple, không bỏ qua được.
              </p>
              <ol className="text-sm space-y-1.5 list-decimal pl-5 mb-4">
                <li>Mở trang này bằng <b>Safari</b> (Chrome trên iPhone không làm được)</li>
                <li>Bấm nút <b>Chia sẻ</b> <span className="opacity-60">(ô vuông có mũi tên đi lên)</span></li>
                <li>Chọn <b>Thêm vào MH chính</b></li>
                <li>Mở app vừa thêm, rồi bấm <b>🔔 Bật thông báo</b> lần nữa</li>
              </ol>
              <button onClick={() => setMoHuongDan(false)}
                className="w-full py-2 rounded-lg bg-[var(--color-dau)] text-white font-medium">
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  if (tt === 'biChan') {
    return (
      <span className={kieuNut} style={{ ...nen, color: '#F7B7D2' }}
        title="Bạn đã chặn thông báo cho trang này. Mở phần cài đặt của trình duyệt để bỏ chặn.">
        🔕 Đã chặn
      </span>
    )
  }

  return (
    <button onClick={tt === 'bat' ? tat : bat} disabled={dangXuLy} className={kieuNut}
      style={{ ...nen, color: tt === 'bat' ? '#A9D8D5' : '#F7B7D2' }}
      title={tt === 'bat' ? 'Đang nhận thông báo trên máy này — bấm để tắt' : 'Nhận thông báo cả khi đóng app'}>
      {dangXuLy ? '…' : tt === 'bat' ? '🔔 Đang bật' : '🔔 Bật thông báo'}
    </button>
  )
}
