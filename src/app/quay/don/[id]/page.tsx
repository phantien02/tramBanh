'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import OrderDetail from '@/components/OrderDetail'

export default function ChiTietDonQuay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [suaMode] = useState(false) // nút "Sửa đơn" điều hướng sang form sửa ở bước sau nếu cần mở rộng
  void suaMode
  return (
    <div className="p-4 space-y-3">
      <Link href="/quay" className="text-pink-600 font-medium">← Về bảng đơn</Link>
      <OrderDetail id={Number(id)} vaiTro="quay" />
      <p className="max-w-2xl mx-auto">
        <Link href={`/quay/don/${id}/sua`} className="text-sm text-gray-500 underline">Sửa nội dung đơn</Link>
      </p>
    </div>
  )
}
