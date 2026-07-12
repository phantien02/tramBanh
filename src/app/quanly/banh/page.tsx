'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import AppShell from '@/components/AppShell'
import NhapNghin from '@/components/NhapNghin'
import { dinhDangTien } from '@/lib/time'
import type { SessionUser } from '@/lib/session'

type Loai = 'cot' | 'mut' | 'topping' | 'size'
type Opt = { id: number; loai: Loai; ten: string; thuTu: number; active: number; phuThuKieu: 'phan_tram' | 'tien' | null; phuThuGiaTri: number }
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

// Nút ⋮ mở menu tùy chọn cho mỗi dòng (giữ dòng gọn trên mobile). Bấm ra ngoài để đóng.
function MenuBaCham({ moKey, menuMo, setMenuMo, children }: {
  moKey: string; menuMo: string | null; setMenuMo: (k: string | null) => void; children: ReactNode
}) {
  const mo = menuMo === moKey
  return (
    <div className="relative shrink-0">
      <button
        type="button" aria-label="Tùy chọn" aria-expanded={mo}
        onClick={() => setMenuMo(mo ? null : moKey)}
        className={`w-9 h-9 flex items-center justify-center rounded-lg text-xl leading-none border transition-colors ${mo ? 'bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-caphe)]' : 'border-transparent text-[var(--color-xam)] hover:bg-[var(--color-surface-2)]'}`}
      >⋮</button>
      {mo && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuMo(null)} />
          <div className="absolute right-0 top-full mt-1 z-30 w-60 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 space-y-1"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,.14)' }}>
            {children}
          </div>
        </>
      )}
    </div>
  )
}

// Nút hành động trong menu (Đổi tên / Xóa)
function MucMenu({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${danger
        ? 'text-[var(--color-dau-600)] hover:bg-[var(--color-dau)] hover:text-white'
        : 'text-[var(--color-caphe)] hover:bg-[var(--color-surface-2)]'}`}
    >{children}</button>
  )
}

export default function BanhPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [data, setData] = useState<BanhOptions | null>(null)
  const [them, setThem] = useState<Record<Loai, string>>({ cot: '', mut: '', topping: '', size: '' })
  const [dsPhuKien, setDsPhuKien] = useState<PhuKien[]>([])
  const [pkMoi, setPkMoi] = useState<{ ten: string; gia: number }>({ ten: '', gia: 0 })
  const [menuMo, setMenuMo] = useState<string | null>(null) // key dòng đang mở menu ⋮

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

  // Sửa phụ thu của một vị (cốt/mứt/topping). Cập nhật lạc quan để ô nhập không giật.
  async function doiPhuThu(o: Opt, patch: { phuThuKieu?: 'phan_tram' | 'tien' | null; phuThuGiaTri?: number }) {
    setData((d) => (d ? { ...d, [o.loai]: d[o.loai].map((x) => (x.id === o.id ? { ...x, ...patch } : x)) } : d))
    await fetch(`/api/banh-options/${o.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch),
    })
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
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-caphe)]">{o.ten}</span>
                    {loai !== 'size' && (
                      <span className={`num text-xs shrink-0 ${o.phuThuKieu ? 'text-[var(--color-caramel-600)] font-medium' : 'text-[var(--color-xam)]'}`}>
                        {o.phuThuKieu === 'phan_tram' ? `+${o.phuThuGiaTri}%` : o.phuThuKieu === 'tien' ? `+${dinhDangTien(o.phuThuGiaTri)}` : 'Miễn phí'}
                      </span>
                    )}
                    <MenuBaCham moKey={`vi-${o.id}`} menuMo={menuMo} setMenuMo={setMenuMo}>
                      {loai !== 'size' && (
                        <div className="px-1 pb-1">
                          <p className="text-xs text-[var(--color-xam)] mb-1">Phụ thu khi khách chọn</p>
                          <div className="flex items-center gap-2">
                            <select
                              value={o.phuThuKieu ?? ''} aria-label="Kiểu phụ thu"
                              onChange={(e) => {
                                const kieu = (e.target.value || null) as 'phan_tram' | 'tien' | null
                                doiPhuThu(o, { phuThuKieu: kieu, phuThuGiaTri: kieu ? o.phuThuGiaTri : 0 })
                              }}
                              className="tb-input text-sm px-2 py-1.5 flex-1"
                            >
                              <option value="">Miễn phí</option>
                              <option value="phan_tram">Theo %</option>
                              <option value="tien">Cộng tiền</option>
                            </select>
                            {o.phuThuKieu === 'phan_tram' && (
                              <div className="relative w-16 shrink-0">
                                <input inputMode="numeric" className="tb-input num w-full pr-5 text-center px-2 py-1.5"
                                  value={o.phuThuGiaTri || ''} placeholder="10"
                                  onChange={(e) => doiPhuThu(o, { phuThuGiaTri: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-xam)] text-sm pointer-events-none">%</span>
                              </div>
                            )}
                            {o.phuThuKieu === 'tien' && (
                              <NhapNghin className="w-24 shrink-0" giaTri={o.phuThuGiaTri} onDoi={(g) => doiPhuThu(o, { phuThuGiaTri: g })} placeholder="vd 5" />
                            )}
                          </div>
                          <div className="border-t border-[var(--color-line)] my-2" />
                        </div>
                      )}
                      <MucMenu onClick={() => { setMenuMo(null); doiTen(o) }}>✏️ Đổi tên</MucMenu>
                      <MucMenu danger onClick={() => { setMenuMo(null); xoaVi(o) }}>🗑️ Xóa</MucMenu>
                    </MenuBaCham>
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
              className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-caphe)]">{p.ten}</span>
              <span className="num text-xs shrink-0 text-[var(--color-caramel-600)] font-medium">{dinhDangTien(p.gia)}</span>
              <MenuBaCham moKey={`pk-${p.id}`} menuMo={menuMo} setMenuMo={setMenuMo}>
                <div className="px-1 pb-1">
                  <p className="text-xs text-[var(--color-xam)] mb-1">Giá phụ kiện</p>
                  <NhapNghin className="w-full" giaTri={p.gia} onDoi={(g) => doiGiaPhuKien(p, g)} placeholder="Giá (vd 5)" />
                  <div className="border-t border-[var(--color-line)] my-2" />
                </div>
                <MucMenu onClick={() => { setMenuMo(null); doiTenPhuKien(p) }}>✏️ Đổi tên</MucMenu>
                <MucMenu danger onClick={() => { setMenuMo(null); xoaPhuKien(p) }}>🗑️ Xóa</MucMenu>
              </MenuBaCham>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="tb-input flex-1"
            placeholder="Thêm phụ kiện… (vd Nến số)"
            value={pkMoi.ten}
            onChange={(e) => setPkMoi((s) => ({ ...s, ten: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') themPhuKien() }}
          />
          <div className="flex items-center gap-2 shrink-0">
            <NhapNghin className="flex-1 sm:w-28 sm:flex-none" giaTri={pkMoi.gia} onDoi={(g) => setPkMoi((s) => ({ ...s, gia: g }))} placeholder="Giá (vd 5)" />
            <button onClick={themPhuKien} className="btn-primary shrink-0">＋ Thêm</button>
          </div>
        </div>
        <p className="text-xs text-[var(--color-xam)] mt-2">
          Giá nhập theo nghìn đồng (gõ 5 = {dinhDangTien(5000)}). Giá sửa trực tiếp trong ô, tự lưu.
        </p>
      </div>
    </AppShell>
  )
}
