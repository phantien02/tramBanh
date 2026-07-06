'use client'
import { dinhDangGio, dinhDangNgay, mucCanhBao } from '@/lib/time'
import { TEN_TRANG_THAI, type TrangThai } from '@/lib/status'

export type DonHienThi = {
  id: number; maDon: string; ngayGioNhan: number; trangThai: string; daSua: number
  nguon: string; hinhThucNhan: string
  khach?: { ten: string; sdt: string } | null
  items: { tenMon: string; coBanh?: string | null; soLuong: number; chuViet?: string | null }[]
}

const TEN_NGUON: Record<string, string> = {
  tai_quay: 'Tại quầy', zalo: 'Zalo', messenger: 'Messenger', dien_thoai: 'Điện thoại', khac: 'Khác',
}

export default function OrderCard({ don, now, onClick }: { don: DonHienThi; now: number; onClick?: () => void }) {
  const muc = mucCanhBao(don, now)
  const vien = muc === 'tre_han' ? 'border-red-500/50 bg-red-900/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
    : muc === 'sap_den_han' ? 'border-amber-500/50 bg-amber-900/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'glass-card'
    
  return (
    <div onClick={onClick} className={`p-4 cursor-pointer relative overflow-hidden flex flex-col gap-3 group ${vien} ${muc === 'tre_han' ? 'animate-pulse' : ''} ${muc !== 'tre_han' && muc !== 'sap_den_han' ? 'hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300' : ''}`}>
      {/* Accent bar on the left */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-opacity ${muc === 'tre_han' ? 'bg-red-500' : muc === 'sap_den_han' ? 'bg-amber-500' : 'bg-[var(--color-gold-500)] opacity-0 group-hover:opacity-100'}`}></div>
      
      <div className="flex items-center gap-3">
        <span className="font-bold text-[var(--color-gold-400)] text-lg">{don.maDon}</span>
        <div className="ml-auto flex items-center gap-2">
           <span className={`font-bold text-xl ${muc === 'tre_han' ? 'text-red-400' : muc === 'sap_den_han' ? 'text-amber-400' : 'text-white'}`}>
             {dinhDangGio(don.ngayGioNhan)}
           </span>
           <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md">{dinhDangNgay(don.ngayGioNhan)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span className="font-medium">{don.khach?.ten ?? 'Khách lẻ'}</span>
        <span className="ml-auto text-xs bg-white/10 text-gray-300 rounded px-2 py-1">{TEN_NGUON[don.nguon] ?? don.nguon}</span>
        {don.daSua === 1 && <span className="text-xs bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded px-2 py-1 font-bold">ĐÃ SỬA</span>}
      </div>
      
      <ul className="text-sm text-gray-400 space-y-1">
        {don.items.map((it, i) => (
          <li key={i} className="flex items-start">
            <span className="text-[var(--color-gold-500)] font-medium mr-1.5">{it.soLuong}×</span>
            <span>
              <span className="text-gray-200">{it.tenMon}</span>
              {it.coBanh ? <span className="text-gray-500"> ({it.coBanh})</span> : ''}
              {it.chuViet && <span className="text-pink-400 font-medium ml-1 block mt-0.5 text-xs">✍️ “{it.chuViet}”</span>}
            </span>
          </li>
        ))}
      </ul>
      
      <div className="mt-auto pt-2 border-t border-[var(--color-dark-border)] flex items-center justify-between">
         <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{TEN_TRANG_THAI[don.trangThai as TrangThai]}</div>
         <div className="text-xs text-gray-500">{don.hinhThucNhan === 'giao_hang' ? '🚚 Giao hàng' : '🏠 Tại quán'}</div>
      </div>
    </div>
  )
}
