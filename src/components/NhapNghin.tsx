'use client'

// Ô nhập tiền theo "nghìn đồng": gõ 235 → hiển thị "235" kèm đuôi cố định ".000đ" (giá trị lưu = 235000)
export default function NhapNghin({ giaTri, onDoi, placeholder, className }: {
  giaTri: number; onDoi: (v: number) => void; placeholder?: string; className?: string
}) {
  const nghin = giaTri ? Math.round(giaTri / 1000) : null
  const hienThi = nghin == null ? '' : nghin.toLocaleString('vi-VN')
  return (
    <div className={`relative ${className ?? ''}`}>
      <input inputMode="numeric" placeholder={placeholder} className="tb-input num w-full pr-14"
        value={hienThi} onChange={(e) => onDoi((Number(e.target.value.replace(/\D/g, '')) || 0) * 1000)} />
      {giaTri > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-xam)] text-sm num pointer-events-none">.000đ</span>
      )}
    </div>
  )
}
