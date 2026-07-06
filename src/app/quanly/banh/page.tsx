'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { dinhDangTien } from '@/lib/time'
import type { SessionUser } from '@/lib/session'

type Size = { tenCo: string; gia: number }
type SanPham = { id: number; ten: string; nhom: string; anh: string | null; active: number; sizes: Size[] }

export default function BanhPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ds, setDs] = useState<SanPham[]>([])
  const [form, setForm] = useState<{ id?: number; ten: string; nhom: string; anh?: string; sizes: Size[] } | null>(null)

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  const tai = useCallback(async () => setDs((await fetch('/api/products').then((r) => r.json())).products), [])
  useEffect(() => { tai() }, [tai])

  async function luu() {
    if (!form) return
    const { id, ...body } = form
    await fetch(id ? `/api/products/${id}` : '/api/products', {
      method: id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    })
    setForm(null); tai()
  }

  async function doiAnh(file: File) {
    const fd = new FormData(); fd.append('file', file)
    const { filePath } = await fetch('/api/upload', { method: 'POST', body: fd }).then((r) => r.json())
    setForm((f) => f && { ...f, anh: filePath })
  }

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Danh mục bánh">
      <button onClick={() => setForm({ ten: '', nhom: '', sizes: [{ tenCo: '', gia: 0 }] })}
        className="bg-pink-600 text-white rounded-xl px-5 py-3 font-bold mb-4">＋ Thêm bánh</button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ds.map((p) => (
          <div key={p.id} className={`bg-white rounded-xl p-3 shadow-sm ${!p.active && 'opacity-40'}`}>
            {p.anh ? <img src={`/api/uploads/${p.anh}`} alt="" className="h-28 w-full object-cover rounded-lg" />
              : <div className="h-28 bg-pink-50 rounded-lg flex items-center justify-center text-4xl">🎂</div>}
            <div className="font-bold mt-2">{p.ten}</div>
            <div className="text-xs text-gray-500">{p.nhom}</div>
            <ul className="text-sm">{p.sizes.map((s, i) => <li key={i}>{s.tenCo}: {dinhDangTien(s.gia)}</li>)}</ul>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setForm({ id: p.id, ten: p.ten, nhom: p.nhom, anh: p.anh ?? undefined, sizes: p.sizes.map((s) => ({ tenCo: s.tenCo, gia: s.gia })) })}
                className="text-sm border rounded-lg px-3 py-1">Sửa</button>
              <button onClick={async () => { await fetch(`/api/products/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: !p.active }) }); tai() }}
                className="text-sm border rounded-lg px-3 py-1">{p.active ? 'Ngừng bán' : 'Bán lại'}</button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg">{form.id ? 'Sửa bánh' : 'Thêm bánh'}</h2>
            <input className="border rounded-lg p-2 w-full" placeholder="Tên bánh" value={form.ten} onChange={(e) => setForm({ ...form, ten: e.target.value })} />
            <input className="border rounded-lg p-2 w-full" placeholder="Nhóm (Bánh kem sinh nhật…)" value={form.nhom} onChange={(e) => setForm({ ...form, nhom: e.target.value })} />
            <label className="block">
              {form.anh && <img src={`/api/uploads/${form.anh}`} alt="" className="h-20 rounded-lg mb-1" />}
              <span className="text-sm border rounded-lg px-3 py-1.5 cursor-pointer inline-block">📷 Chọn ảnh</span>
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && doiAnh(e.target.files[0])} />
            </label>
            {form.sizes.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input className="border rounded-lg p-2 flex-1" placeholder="Cỡ (16cm…)" value={s.tenCo}
                  onChange={(e) => setForm({ ...form, sizes: form.sizes.map((x, j) => (j === i ? { ...x, tenCo: e.target.value } : x)) })} />
                <input type="number" className="border rounded-lg p-2 w-32" placeholder="Giá" value={s.gia}
                  onChange={(e) => setForm({ ...form, sizes: form.sizes.map((x, j) => (j === i ? { ...x, gia: Number(e.target.value) } : x)) })} />
                <button onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, j) => j !== i) })} className="text-red-500 px-2">✕</button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, sizes: [...form.sizes, { tenCo: '', gia: 0 }] })} className="text-sm text-pink-600">＋ Thêm cỡ</button>
            <button onClick={luu} className="w-full bg-pink-600 text-white rounded-xl p-3 font-bold">Lưu</button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
