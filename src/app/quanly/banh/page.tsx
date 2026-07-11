'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import NhapNghin from '@/components/NhapNghin'
import { dinhDangTien } from '@/lib/time'
import type { SessionUser } from '@/lib/session'

type Loai = 'cot' | 'mut' | 'topping' | 'size'
type Opt = { id: number; loai: Loai; ten: string; thuTu: number; active: number }
type BanhOptions = {
  cot: Opt[]
  mut: Opt[]
  topping: Opt[]
  size: Opt[]
  sanPhamMau: { id: number; ten: string } | null
}
type PhuKien = { id: number; ten: string; gia: number; thuTu: number; active: number }

const KHOI: { loai: Loai; ten: string; goiYThem: string }[] = [
  { loai: 'cot', ten: 'Cốt bánh', goiYThem: 'Thêm vị cốt bánh…' },
  { loai: 'mut', ten: 'Mứt', goiYThem: 'Thêm vị mứt…' },
  { loai: 'topping', ten: 'Topping', goiYThem: 'Thêm topping…' },
  { loai: 'size', ten: 'Size', goiYThem: 'Thêm size…' },
]

export default function BanhPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [data, setData] = useState<BanhOptions | null>(null)
  const [them, setThem] = useState<Record<Loai, string>>({ cot: '', mut: '', topping: '', size: '' })
  const [dsPhuKien, setDsPhuKien] = useState<PhuKien[]>([])
  const [pkMoi, setPkMoi] = useState<{ ten: string; gia: number }>({ ten: '', gia: 0 })

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  const tai = useCallback(async () => {
    setData(await fetch('/api/banh-options').then((r) => r.json()))
    const pk = await fetch('/api/phu-kien').then((r) => r.json())
    setDsPhuKien(pk.items ?? [])
  }, [])
  useEffect(() => { tai() }, [tai])

  async function themVi(loai: Loai) {
    const ten = them[loai].trim()
    if (!ten) return
    await fetch('/api/banh-options', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loai, ten }),
    })
    setThem((s) => ({ ...s, [loai]: '' }))
    tai()
  }

  async function doiTen(o: Opt) {
    const ten = window.prompt('Đổi tên vị', o.ten)?.trim()
    if (!ten || ten === o.ten) return
    await fetch(`/api/banh-options/${o.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ten }),
    })
    tai()
  }

  async function xoaVi(o: Opt) {
    if (!confirm(`Xóa "${o.ten}" khỏi danh sách? (Đơn cũ đã lưu vị này không bị ảnh hưởng)`)) return
    await fetch(`/api/banh-options/${o.id}`, { method: 'DELETE' })
    tai()
  }

  async function themPhuKien() {
    const ten = pkMoi.ten.trim()
    if (!ten) return
    await fetch('/api/phu-kien', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(pkMoi),
    })
    setPkMoi({ ten: '', gia: 0 })
    tai()
  }

  async function doiTenPhuKien(p: PhuKien) {
    const ten = window.prompt('Đổi tên phụ kiện', p.ten)?.trim()
    if (!ten || ten === p.ten) return
    await fetch(`/api/phu-kien/${p.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ten }),
    })
    tai()
  }

  async function doiGiaPhuKien(p: PhuKien, gia: number) {
    // cập nhật lạc quan để ô nhập không giật khi gõ
    setDsPhuKien((ds) => ds.map((x) => (x.id === p.id ? { ...x, gia } : x)))
    await fetch(`/api/phu-kien/${p.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gia }),
    })
  }

  async function xoaPhuKien(p: PhuKien) {
    if (!confirm(`Xóa phụ kiện "${p.ten}"? (Đơn cũ đã lưu phụ kiện này không bị ảnh hưởng)`)) return
    await fetch(`/api/phu-kien/${p.id}`, { method: 'DELETE' })
    tai()
  }

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Cấu hình sản phẩm">
      {/* ====== Cấu hình vị bánh ====== */}
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-[var(--color-caphe)]">🎂 Cấu hình vị bánh</h2>
        <div className="text-xs uppercase tracking-wide text-[var(--color-xam)] mt-1">
          Sản phẩm mẫu: {data?.sanPhamMau?.ten ?? '—'}
        </div>
      </div>

      <div className="md:columns-2 md:gap-4">
        {KHOI.map(({ loai, ten, goiYThem }) => {
          const items = data?.[loai] ?? []
          return (
            <div key={loai} className="tb-card p-4 mb-4 break-inside-avoid">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-lg text-[var(--color-caphe)]">{ten}</h3>
                <span className="tb-chip tb-chip-caramel">{items.length}</span>
              </div>

              <ul className="space-y-2 mb-3">
                {items.length === 0 && (
                  <li className="text-sm text-[var(--color-xam)]">Chưa có vị nào.</li>
                )}
                {items.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2"
                  >
                    <span className="text-sm font-medium text-[var(--color-caphe)] truncate">{o.ten}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => doiTen(o)} className="tb-btn-ghost text-xs px-3 py-1">Sửa</button>
                      <button onClick={() => xoaVi(o)} className="text-xs px-3 py-1 rounded-lg font-medium text-[var(--color-dau-600)] hover:text-white hover:bg-[var(--color-dau)] border border-[var(--color-line)] transition-colors">Xóa</button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <input
                  className="tb-input flex-1"
                  placeholder={goiYThem}
                  value={them[loai]}
                  onChange={(e) => setThem((s) => ({ ...s, [loai]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') themVi(loai) }}
                />
                <button onClick={() => themVi(loai)} className="btn-primary shrink-0">＋ Thêm</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ====== Cấu hình phụ kiện ====== */}
      <div className="mt-8 mb-5">
        <h2 className="font-display text-2xl font-semibold text-[var(--color-caphe)]">🕯 Cấu hình phụ kiện</h2>
        <div className="text-xs uppercase tracking-wide text-[var(--color-xam)] mt-1">
          Phụ kiện bán kèm khi tạo đơn (nến, mũ, pháo…)
        </div>
      </div>

      <div className="tb-card p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-lg text-[var(--color-caphe)]">Danh sách phụ kiện</h3>
          <span className="tb-chip tb-chip-caramel">{dsPhuKien.length}</span>
        </div>

        <ul className="space-y-2 mb-3">
          {dsPhuKien.length === 0 && (
            <li className="text-sm text-[var(--color-xam)]">Chưa có phụ kiện nào.</li>
          )}
          {dsPhuKien.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2"
            >
              <span className="text-sm font-medium text-[var(--color-caphe)] truncate flex-1">{p.ten}</span>
              <NhapNghin className="w-32 shrink-0" giaTri={p.gia} onDoi={(g) => doiGiaPhuKien(p, g)} placeholder="Giá" />
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => doiTenPhuKien(p)} className="tb-btn-ghost text-xs px-3 py-1">Sửa</button>
                <button onClick={() => xoaPhuKien(p)} className="text-xs px-3 py-1 rounded-lg font-medium text-[var(--color-dau-600)] hover:text-white hover:bg-[var(--color-dau)] border border-[var(--color-line)] transition-colors">Xóa</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 items-center">
          <input
            className="tb-input flex-1"
            placeholder="Thêm phụ kiện… (vd Nến số)"
            value={pkMoi.ten}
            onChange={(e) => setPkMoi((s) => ({ ...s, ten: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') themPhuKien() }}
          />
          <NhapNghin className="w-32 shrink-0" giaTri={pkMoi.gia} onDoi={(g) => setPkMoi((s) => ({ ...s, gia: g }))} placeholder="Giá (vd 5)" />
          <button onClick={themPhuKien} className="btn-primary shrink-0">＋ Thêm</button>
        </div>
        <p className="text-xs text-[var(--color-xam)] mt-2">
          Giá nhập theo nghìn đồng (gõ 5 = {dinhDangTien(5000)}). Giá sửa trực tiếp trong ô, tự lưu.
        </p>
      </div>
    </AppShell>
  )
}
