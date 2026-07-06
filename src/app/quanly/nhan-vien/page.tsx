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

  useEffect(() => { fetch('/api/me').then((r) => r.json()).then(setUser) }, [])
  const tai = useCallback(async () => setDs((await fetch('/api/users').then((r) => r.json())).users), [])
  useEffect(() => { tai() }, [tai])

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

  if (!user) return null
  return (
    <AppShell user={user} tieuDe="Nhân viên">
      <form onSubmit={them} className="bg-white rounded-xl p-4 flex gap-2 flex-wrap items-end mb-4">
        <input required className="border rounded-lg p-2" placeholder="Tên đăng nhập" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input required className="border rounded-lg p-2" placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input required className="border rounded-lg p-2" placeholder="Họ tên" value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} />
        <select className="border rounded-lg p-2" value={form.vaiTro} onChange={(e) => setForm({ ...form, vaiTro: e.target.value })}>
          {Object.entries(TEN_VAI_TRO).map(([gt, ten]) => <option key={gt} value={gt}>{ten}</option>)}
        </select>
        <button className="bg-pink-600 text-white rounded-lg px-4 py-2 font-bold">＋ Thêm</button>
        {loi && <span className="text-red-600">{loi}</span>}
      </form>

      <table className="w-full bg-white rounded-xl overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left"><tr>{['Tên đăng nhập', 'Họ tên', 'Vai trò', 'Trạng thái', ''].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>
          {ds.map((nv) => (
            <tr key={nv.id} className="border-t">
              <td className="p-2 font-medium">{nv.username}</td>
              <td className="p-2">{nv.hoTen}</td>
              <td className="p-2">
                <select value={nv.vaiTro} onChange={(e) => capNhat(nv.id, { vaiTro: e.target.value })} className="border rounded p-1">
                  {Object.entries(TEN_VAI_TRO).map(([gt, ten]) => <option key={gt} value={gt}>{ten}</option>)}
                </select>
              </td>
              <td className="p-2">{nv.active ? '✅ Hoạt động' : '🔒 Đã khóa'}</td>
              <td className="p-2 space-x-2">
                <button onClick={() => capNhat(nv.id, { active: !nv.active })} className="border rounded-lg px-3 py-1">{nv.active ? 'Khóa' : 'Mở khóa'}</button>
                <button onClick={() => { const mk = window.prompt('Mật khẩu mới:'); if (mk) capNhat(nv.id, { password: mk }) }} className="border rounded-lg px-3 py-1">Đổi mật khẩu</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  )
}
