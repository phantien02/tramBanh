'use client'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import type { SessionUser } from '@/lib/session'

type NhanVien = { id: number; username: string; hoTen: string; vaiTro: string; active: number }
const TEN_VAI_TRO: Record<string, string> = { quay: 'Quầy', bep: 'Bếp', quanly: 'Quản lý' }

export default function NhanVienPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ds, setDs] = useState<NhanVien[]>([])
  const [form, setForm] = useState({ username: '', password: '', hoTen: '', vaiTro: 'quay' })
  const [loi, setLoi] = useState('')
  const [menuMo, setMenuMo] = useState<number | null>(null) // id nhân viên đang mở menu ⋯

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  const tai = useCallback(async () => setDs((await fetch('/api/users').then((r) => r.json())).users), [])
  useEffect(() => { tai() }, [tai])

  // bấm ra ngoài thì đóng menu
  useEffect(() => {
    if (menuMo == null) return
    const dong = () => setMenuMo(null)
    window.addEventListener('click', dong)
    return () => window.removeEventListener('click', dong)
  }, [menuMo])

  async function them(e: React.FormEvent) {
    e.preventDefault(); setLoi('')
    const res = await fetch('/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) { setLoi((await res.json()).error); return }
    setForm({ username: '', password: '', hoTen: '', vaiTro: 'quay' }); tai()
  }

  async function capNhat(id: number, body: object) {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    tai()
  }

  async function xoa(nv: NhanVien) {
    if (!confirm(`Xóa tài khoản "${nv.hoTen}" (${nv.username})? Hành động này không hoàn tác được.`)) return
    const res = await fetch(`/api/users/${nv.id}`, { method: 'DELETE' })
    if (!res.ok) { alert((await res.json()).error ?? 'Không xóa được') }
    tai()
  }

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Nhân viên">
      <form onSubmit={them} className="tb-card p-4 flex gap-2 flex-wrap items-end mb-4">
        <input required className="tb-input w-auto" placeholder="Tên đăng nhập" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input required className="tb-input w-auto" placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input required className="tb-input w-auto" placeholder="Họ tên" value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} />
        <select className="tb-input w-auto" value={form.vaiTro} onChange={(e) => setForm({ ...form, vaiTro: e.target.value })}>
          {Object.entries(TEN_VAI_TRO).map(([gt, ten]) => <option key={gt} value={gt}>{ten}</option>)}
        </select>
        <button className="btn-primary">＋ Thêm</button>
        {loi && <span className="text-[var(--color-dau)]">{loi}</span>}
      </form>

      <div className="tb-card">
      <table className="w-full text-sm">
        <thead className="text-left"><tr>{['Tài khoản', 'Vai trò', ''].map((h, i) => <th key={i} className="p-3 text-[var(--color-caphe)] font-semibold border-b border-[var(--color-line)]">{h}</th>)}</tr></thead>
        <tbody>
          {ds.map((nv) => (
            <tr key={nv.id} className="border-t border-[var(--color-line)] first:border-t-0 hover:bg-[var(--color-surface-2)]">
              <td className="p-3">
                <div className="font-medium text-[var(--color-caphe)]">{nv.hoTen}</div>
                <div className="text-xs text-[var(--color-xam)]">@{nv.username}</div>
              </td>
              <td className="p-3">
                <select value={nv.vaiTro} onChange={(e) => capNhat(nv.id, { vaiTro: e.target.value })} className="tb-input w-auto py-1">
                  {Object.entries(TEN_VAI_TRO).map(([gt, ten]) => <option key={gt} value={gt}>{ten}</option>)}
                </select>
              </td>
              <td className="p-3 text-right">
                <div className="relative inline-block">
                  <button onClick={(e) => { e.stopPropagation(); setMenuMo(menuMo === nv.id ? null : nv.id) }}
                    className="tb-btn-ghost px-3 py-1 text-lg leading-none" title="Hành động">⋯</button>
                  {menuMo === nv.id && (
                    <div className="absolute right-0 top-full mt-1 z-20 tb-card p-1.5 w-44 text-left space-y-0.5"
                      onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { const ten = window.prompt('Họ tên mới:', nv.hoTen)?.trim(); if (ten) { capNhat(nv.id, { hoTen: ten }); setMenuMo(null) } }}
                        className="block w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-surface-2)] text-sm">✏️ Sửa tên</button>
                      <button onClick={() => { const mk = window.prompt('Mật khẩu mới:'); if (mk) { capNhat(nv.id, { password: mk }); setMenuMo(null) } }}
                        className="block w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-surface-2)] text-sm">🔑 Đổi mật khẩu</button>
                      {nv.username !== 'admin' && nv.id !== user?.id && (
                        <button onClick={() => { setMenuMo(null); xoa(nv) }}
                          className="block w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--color-dau-600)] hover:bg-[var(--color-dau)] hover:text-white">🗑 Xóa tài khoản</button>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </AppShell>
  )
}
