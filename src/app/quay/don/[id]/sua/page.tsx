'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import OrderForm, { type GiaTriForm } from '@/components/OrderForm'

export default function SuaDonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [donCu, setDonCu] = useState<GiaTriForm | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')

  useEffect(() => {
    fetch(`/api/orders/${id}`).then((r) => r.json()).then((d) => setDonCu({
      khach: { sdt: d.khach?.sdt ?? '', ten: d.khach?.ten ?? '' },
      nguon: d.nguon, ngayGioNhan: d.ngayGioNhan, hinhThucNhan: d.hinhThucNhan,
      diaChiShip: d.diaChiShip ?? undefined, sdtNguoiNhan: d.sdtNguoiNhan ?? undefined,
      phiShip: d.phiShip, tienCoc: d.tienCoc, hinhThucTt: d.hinhThucTt, ghiChu: d.ghiChu ?? undefined,
      items: d.items.map((it: { productId?: number; tenMon: string; coBanh?: string; soLuong: number; chuViet?: string; ghiChu?: string; gia: number; anhMau: string[] }) => ({ ...it })),
    }))
  }, [id])

  async function luu(v: GiaTriForm) {
    setDangLuu(true); setLoi('')
    const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) })
    if (res.ok) router.push(`/quay/don/${id}`)
    else { setLoi((await res.json()).error ?? 'Lỗi'); setDangLuu(false) }
  }

  if (!donCu) return <p className="p-4">Đang tải…</p>
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold max-w-3xl mx-auto mb-3">✏️ Sửa đơn</h1>
      <OrderForm donCu={donCu} onLuu={luu} dangLuu={dangLuu} loi={loi} />
    </div>
  )
}
