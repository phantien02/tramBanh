'use client'
import { useEffect, useRef, useState } from 'react'
import type { SuKien } from '@/lib/sse'

// dùng chung 1 AudioContext cho cả app — trình duyệt giới hạn số context sống,
// tạo mới mỗi lần chuông kêu sẽ khiến chuông "chết" âm thầm trên tablet chạy lâu ngày
let ctx: AudioContext | undefined

function phatChuong() {
  try {
    ctx ??= new AudioContext()
    ctx.resume()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.4, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    o.start(); o.stop(ctx.currentTime + 0.8)
  } catch { /* trình duyệt chặn khi chưa tương tác — bỏ qua */ }
}

export function useRealtime(onEvent: (e: SuKien) => void, chuongKhi: (e: SuKien) => boolean) {
  const [ketNoi, setKetNoi] = useState(true)
  const cb = useRef({ onEvent, chuongKhi })
  cb.current = { onEvent, chuongKhi }

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onopen = () => { setKetNoi(true); cb.current.onEvent({ type: 'don_cap_nhat', orderId: 0, maDon: '' }) }
    es.onerror = () => setKetNoi(false)
    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data) as SuKien
      cb.current.onEvent(e)
      if (cb.current.chuongKhi(e)) phatChuong()
    }
    return () => es.close()
  }, [])

  return { ketNoi }
}
