'use client'
import { dinhDangGio, dinhDangNgay, mucCanhBao } from '@/lib/time'
import { TEN_TRANG_THAI, type TrangThai } from '@/lib/status'

export type DonHienThi = {
  id: number; maDon: string; ngayGioNhan: number; trangThai: string; daSua: number
  nguon: string; hinhThucNhan: string
  khach?: { ten: string; sdt: string } | null
  items: { tenMon: string; coBanh?: string | null; cot?: string | null; mut?: string | null; topping?: string[]; soLuong: number; chuViet?: string | null }[]
}

const TEN_NGUON: Record<string, string> = {
  tai_quay: 'Tại quầy', zalo: 'Zalo', messenger: 'Messenger', dien_thoai: 'Điện thoại', khac: 'Khác',
}

export default function OrderCard({ don, now, onClick }: { don: DonHienThi; now: number; onClick?: () => void }) {
  const muc = mucCanhBao(don, now)
  const mauStub = muc === 'tre_han' ? 'var(--color-dau)' : muc === 'sap_den_han' ? 'var(--color-caramel)' : 'var(--color-caphe)'
  const vien = muc === 'tre_han'
    ? 'ring-2 ring-[var(--color-dau)]'
    : muc === 'sap_den_han' ? 'ring-2 ring-[var(--color-caramel)]' : ''

  return (
    <article onClick={onClick} className={`tb-ticket cursor-pointer ${vien} ${muc === 'tre_han' ? 'animate-pulse' : ''}`}>
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
          <span className={`num text-2xl leading-none ${muc === 'tre_han' ? 'text-[var(--color-dau)]' : muc === 'sap_den_han' ? 'text-[var(--color-caramel-600)]' : 'text-[var(--color-caphe)]'}`}>
            {dinhDangGio(don.ngayGioNhan)}
          </span>
          <span className="text-[11px] text-[var(--color-xam)] tb-chip">{dinhDangNgay(don.ngayGioNhan)}</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm truncate">{don.khach?.ten ?? 'Khách lẻ'}</span>
          <span className="ml-auto text-[11px] tb-chip">{TEN_NGUON[don.nguon] ?? don.nguon}</span>
          {don.daSua === 1 && <span className="text-[11px] tb-chip-dau tb-chip font-bold">ĐÃ SỬA</span>}
        </div>

        <ul className="text-sm space-y-0.5 text-[var(--color-caphe)]">
          {don.items.map((it, i) => (
            <li key={i} className="flex items-start">
              <span className="num text-[var(--color-caramel-600)] text-xs mr-1.5 mt-0.5">{it.soLuong}×</span>
              <span className="min-w-0">
                <span>{it.tenMon}</span>
                {(it.coBanh || it.cot) && (
                  <span className="text-[11px] text-[var(--color-caramel-600)] font-medium ml-1">
                    {[it.coBanh, it.cot].filter(Boolean).join(' · ')}
                  </span>
                )}
                {it.chuViet && <span className="text-[var(--color-dau)] font-medium ml-1 block text-xs">✍️ &ldquo;{it.chuViet}&rdquo;</span>}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-2.5 pt-2 border-t border-[var(--color-line)] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--color-xam)] uppercase tracking-wider">{TEN_TRANG_THAI[don.trangThai as TrangThai]}</span>
          <span className="text-[11px] text-[var(--color-xam)]">{don.hinhThucNhan === 'giao_hang' || don.hinhThucNhan === 'ship' ? '🛵 Giao' : '🏠 Tại quán'}</span>
        </div>
      </div>
    </article>
  )
}
