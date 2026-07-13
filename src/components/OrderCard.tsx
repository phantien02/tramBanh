'use client'
import { dinhDangGio, dinhDangNgay, noteThoiGian } from '@/lib/time'
import { TEN_TRANG_THAI, type TrangThai } from '@/lib/status'

export type DonHienThi = {
  id: number; maDon: string; ngayGioNhan: number; trangThai: string; daSua: number
  nguon: string; hinhThucNhan: string; ketThucKieu?: string | null; ghiChu?: string | null
  donQuaTang?: number
  khach?: { ten: string; sdt: string } | null
  items: { tenMon: string; coBanh?: string | null; cot?: string | null; kem?: string | null; mut?: string | null; topping?: string[]; soLuong: number; chuViet?: string | null; anhMau?: string[] }[]
  phuKien?: { ten: string; gia: number; soLuong: number }[]
}

const TEN_NGUON: Record<string, string> = {
  tai_quay: 'Tại quầy', zalo: 'Zalo', messenger: 'Messenger', dien_thoai: 'Điện thoại', khac: 'Khác',
}

export function laShip(hinhThucNhan: string): boolean {
  return hinhThucNhan === 'ship'
}

export default function OrderCard({ don, now, onClick, actions }: { don: DonHienThi; now: number; onClick?: () => void; actions?: React.ReactNode }) {
  const { muc, text: noteGio } = noteThoiGian(don, now)
  const ship = laShip(don.hinhThucNhan)
  const mauStub = muc === 'tre_han' ? 'var(--color-baodong)' : muc === 'sap_den_han' ? 'var(--color-canhbao)' : 'var(--color-caphe)'
  const vien = muc === 'tre_han'
    ? 'ring-2 ring-[var(--color-baodong)]'
    : muc === 'sap_den_han' ? 'ring-2 ring-[var(--color-canhbao)]' : ''
  const nenBaoDong = muc === 'tre_han' ? { background: 'var(--color-baodong-bg)' } : undefined

  return (
    <article onClick={onClick} style={nenBaoDong} className={`tb-ticket cursor-pointer ${vien} ${muc === 'tre_han' ? 'animate-pulse' : ''}`}>
      {/* Cuống vé — mã đơn dọc */}
      <div className="flex-none w-11 flex items-center justify-center" style={{ background: mauStub }}>
        <span className="tb-ticket-mono text-white text-xs tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {don.maDon}
        </span>
      </div>
      {/* Lỗ răng cưa */}
      <span className="absolute w-3.5 h-3.5 rounded-full bg-[var(--color-surface-2)]" style={{ left: '37px', top: '-7px' }} />
      <span className="absolute w-3.5 h-3.5 rounded-full bg-[var(--color-surface-2)]" style={{ left: '37px', bottom: '-7px' }} />

      {/* Thân vé */}
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className={`num text-2xl leading-none font-bold ${muc === 'tre_han' ? 'text-[var(--color-baodong)]' : muc === 'sap_den_han' ? 'text-[var(--color-canhbao-600)]' : 'text-[var(--color-caphe)]'}`}>
            {dinhDangGio(don.ngayGioNhan)}
          </span>
          <span className="text-[11px] text-[var(--color-xam)] tb-chip">{dinhDangNgay(don.ngayGioNhan)}</span>
        </div>

        {noteGio && (
          <div className={`mb-2 inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${
            muc === 'tre_han'
              ? 'text-white bg-[var(--color-baodong)]'
              : 'text-[var(--color-canhbao-600)] bg-[var(--color-canhbao-bg)]'}`}>
            {noteGio}
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm truncate">{don.khach?.ten ?? 'Khách lẻ'}</span>
          <span className="ml-auto text-[11px] tb-chip">{TEN_NGUON[don.nguon] ?? don.nguon}</span>
          {don.daSua === 1 && <span className="text-[11px] tb-chip-dau tb-chip font-bold">ĐÃ SỬA</span>}
        </div>

        <div className="space-y-2">
          {don.items.map((it, i) => (
            <div key={i} className="space-y-1">
              {it.anhMau && it.anhMau.length > 0 && (
                <div className="relative">
                  <img src={`/api/uploads/${it.anhMau[0]}`} alt="mẫu bánh" loading="lazy"
                    className="w-full h-32 object-cover rounded-lg border border-[var(--color-line)]" />
                  {it.soLuong > 1 && (
                    <span className="num absolute top-1.5 right-1.5 bg-[var(--color-caphe)] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">×{it.soLuong}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                {!(it.anhMau && it.anhMau.length > 0) && it.soLuong > 1 && (
                  <span className="num font-bold text-sm text-[var(--color-caramel-600)]">×{it.soLuong}</span>
                )}
                {it.coBanh && <span className="tb-chip tb-chip-caramel font-bold">📏 {it.coBanh}</span>}
                {(it.cot || it.kem || it.mut) && (
                  <span className="text-[var(--color-caramel-600)] font-medium">{[it.cot, it.kem, it.mut].filter(Boolean).join(' · ')}</span>
                )}
              </div>
              {it.chuViet && <div className="text-[var(--color-dau)] font-semibold text-xs">✍️ &ldquo;{it.chuViet}&rdquo;</div>}
            </div>
          ))}
        </div>

        {don.phuKien && don.phuKien.length > 0 && (
          <div className="mt-2 text-xs text-[var(--color-caphe)] bg-[var(--color-surface-2)] rounded-lg p-1.5">
            🕯 {don.phuKien.map((p) => `${p.ten} ×${p.soLuong}`).join(' · ')}
          </div>
        )}

        {don.ghiChu && (
          <div className="mt-2 text-xs text-[var(--color-caphe)] bg-[var(--color-surface-2)] rounded-lg p-1.5">📝 {don.ghiChu}</div>
        )}

        <div className="mt-2.5 pt-2 border-t border-[var(--color-line)] flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[var(--color-xam)] uppercase tracking-wider">{TEN_TRANG_THAI[don.trangThai as TrangThai]}</span>
          <span className="flex items-center gap-1.5">
            {don.donQuaTang === 1 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full tb-chip-dau">🎁 Quà tặng</span>}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ship ? 'tb-chip-dau' : 'tb-chip-tra'}`}>
              {ship ? '🛵 Ship' : '🏠 Tại quán'}
            </span>
          </span>
        </div>

        {actions && (
          <div className="mt-2 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>{actions}</div>
        )}
      </div>
    </article>
  )
}
