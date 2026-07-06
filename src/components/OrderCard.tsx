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
  const vien = muc === 'tre_han' ? 'border-red-500 bg-red-50 animate-pulse'
    : muc === 'sap_den_han' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'
  return (
    <div onClick={onClick} className={`border-2 rounded-xl p-3 shadow-sm cursor-pointer space-y-1 ${vien}`}>
      <div className="flex items-center gap-2">
        <span className="font-bold">{don.maDon}</span>
        <span className="font-bold text-lg ml-auto">{dinhDangGio(don.ngayGioNhan)}</span>
        <span className="text-xs text-gray-500">{dinhDangNgay(don.ngayGioNhan)}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span>{don.khach?.ten ?? 'Khách lẻ'}</span>
        <span className="ml-auto text-xs bg-gray-100 rounded px-1.5 py-0.5">{TEN_NGUON[don.nguon] ?? don.nguon}</span>
        {don.daSua === 1 && <span className="text-xs bg-orange-500 text-white rounded px-1.5 py-0.5 font-bold">ĐÃ SỬA</span>}
      </div>
      <ul className="text-sm text-gray-700">
        {don.items.map((it, i) => (
          <li key={i}>
            {it.soLuong}× {it.tenMon}{it.coBanh ? ` (${it.coBanh})` : ''}
            {it.chuViet && <span className="text-pink-700 font-medium"> — “{it.chuViet}”</span>}
          </li>
        ))}
      </ul>
      <div className="text-xs font-semibold text-gray-500">{TEN_TRANG_THAI[don.trangThai as TrangThai]}</div>
    </div>
  )
}
