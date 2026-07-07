'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
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

const KHOI: { loai: Loai; ten: string }[] = [
  { loai: 'cot', ten: 'Cốt bánh' },
  { loai: 'mut', ten: 'Mứt' },
  { loai: 'topping', ten: 'Topping' },
  { loai: 'size', ten: 'Size' },
]

export default function BanhPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [data, setData] = useState<BanhOptions | null>(null)
  const [them, setThem] = useState<Record<Loai, string>>({ cot: '', mut: '', topping: '', size: '' })

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  const tai = useCallback(async () => {
    setData(await fetch('/api/banh-options').then((r) => r.json()))
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

  async function doiHien(o: Opt) {
    await fetch(`/api/banh-options/${o.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: !o.active }),
    })
    tai()
  }

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Danh sách vị bánh">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-wide text-[var(--color-xam)]">Sản phẩm mẫu</div>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-caphe)]">
          {data?.sanPhamMau?.ten ?? '—'}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {KHOI.map(({ loai, ten }) => {
          const items = data?.[loai] ?? []
          return (
            <div key={loai} className="tb-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-lg text-[var(--color-caphe)]">{ten}</h3>
                <span className="tb-chip tb-chip-caramel">{items.filter((i) => i.active).length}</span>
              </div>

              <ul className="space-y-2 mb-3">
                {items.length === 0 && (
                  <li className="text-sm text-[var(--color-xam)]">Chưa có vị nào.</li>
                )}
                {items.map((o) => (
                  <li
                    key={o.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2 ${o.active ? '' : 'opacity-45'}`}
                  >
                    <span className="text-sm font-medium text-[var(--color-caphe)] truncate">{o.ten}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => doiTen(o)} className="tb-btn-ghost text-xs px-3 py-1">Sửa</button>
                      <button onClick={() => doiHien(o)} className="tb-btn-ghost text-xs px-3 py-1">
                        {o.active ? 'Ẩn' : 'Hiện lại'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <input
                  className="tb-input flex-1"
                  placeholder={`Thêm vị ${ten.toLowerCase()}…`}
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
    </AppShell>
  )
}
