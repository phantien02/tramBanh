'use client'
import { useRef, useState } from 'react'

const TOI_DA = 3

// Popup hiện khi bếp bấm "🎂 Xong": chụp ảnh (mở camera trên điện thoại) hoặc
// tải ảnh thành phẩm lên. Không bắt buộc — có nút bỏ qua.
export default function ChupAnhThanhPham({ maDon, dangGui, onXacNhan, onDong }: {
  maDon: string
  dangGui: boolean
  onXacNhan: (anh: string[]) => void
  onDong: () => void
}) {
  const [anh, setAnh] = useState<string[]>([])
  const [dangTai, setDangTai] = useState(false)
  const refChup = useRef<HTMLInputElement>(null)
  const refTai = useRef<HTMLInputElement>(null)

  async function themAnh(file: File | undefined) {
    if (!file) return
    if (anh.length >= TOI_DA) { alert(`Tối đa ${TOI_DA} ảnh thành phẩm.`); return }
    setDangTai(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(`Tải ảnh thất bại: ${data.error}`); return }
      setAnh((ds) => [...ds, data.filePath])
    } finally {
      setDangTai(false)
      // reset để chọn lại cùng 1 file vẫn bắn onChange
      if (refChup.current) refChup.current.value = ''
      if (refTai.current) refTai.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={onDong}>
      <div className="tb-card max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
          <h2 className="font-display text-xl text-[var(--color-caramel-600)]">📸 Ảnh thành phẩm</h2>
          <span className="num text-[var(--color-xam)]">{maDon}</span>
        </div>

        <p className="text-sm text-[var(--color-xam)]">
          Chụp hoặc tải ảnh bánh đã hoàn thành để lưu vào đơn ({anh.length}/{TOI_DA} ảnh).
        </p>

        {/* Ảnh đã thêm */}
        {anh.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {anh.map((f) => (
              <span key={f} className="relative">
                <img src={`/api/uploads/${f}`} alt="thành phẩm" className="h-24 w-24 object-cover rounded-xl border border-[var(--color-line)]" />
                <button type="button" onClick={() => setAnh((ds) => ds.filter((x) => x !== f))}
                  className="absolute -top-1.5 -right-1.5 bg-[var(--color-dau)] text-white rounded-full w-6 h-6 text-xs leading-none flex items-center justify-center">✕</button>
              </span>
            ))}
          </div>
        )}

        {/* capture="environment" → điện thoại mở thẳng camera sau; máy tính rơi về chọn file */}
        <input ref={refChup} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => themAnh(e.target.files?.[0])} />
        <input ref={refTai} type="file" accept="image/*" hidden
          onChange={(e) => themAnh(e.target.files?.[0])} />

        {anh.length < TOI_DA && (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={dangTai} onClick={() => refChup.current?.click()}
              className="tb-btn-ghost py-4 text-lg border-dashed disabled:opacity-40">📷 Chụp ảnh</button>
            <button type="button" disabled={dangTai} onClick={() => refTai.current?.click()}
              className="tb-btn-ghost py-4 text-lg border-dashed disabled:opacity-40">🖼 Tải ảnh lên</button>
          </div>
        )}
        {dangTai && <p className="text-sm text-[var(--color-xam)] text-center">Đang tải ảnh…</p>}

        <div className="space-y-2 pt-2">
          <button type="button" disabled={dangGui || dangTai || anh.length === 0} onClick={() => onXacNhan(anh)}
            className="btn-primary w-full py-3 text-lg disabled:opacity-40">
            {dangGui ? 'Đang lưu…' : `✅ Xác nhận xong${anh.length ? ` (${anh.length} ảnh)` : ''}`}
          </button>
          <div className="flex gap-2">
            <button type="button" disabled={dangGui} onClick={onDong} className="tb-btn-ghost flex-1 py-2.5">✕ Hủy thao tác</button>
            <button type="button" disabled={dangGui || dangTai} onClick={() => onXacNhan([])}
              className="tb-btn-ghost flex-1 py-2.5 text-[var(--color-xam)]">Bỏ qua — xong không ảnh</button>
          </div>
        </div>
      </div>
    </div>
  )
}
