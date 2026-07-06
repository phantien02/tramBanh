'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OrderForm, { type GiaTriForm } from '@/components/OrderForm'

export default function DonMoiPage() {
  const router = useRouter()
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')

  async function luu(v: GiaTriForm) {
    setDangLuu(true); setLoi('')
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) })
    if (res.ok) router.push('/quay')
    else { setLoi((await res.json()).error ?? 'Lỗi không rõ'); setDangLuu(false) }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold max-w-3xl mx-auto mb-3">＋ Đơn mới</h1>
      <OrderForm onLuu={luu} dangLuu={dangLuu} loi={loi} />
    </div>
  )
}
