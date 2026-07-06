import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

process.env.DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-test-'))

const { quetNhacNho } = await import('./reminder-job')
const { taoDon } = await import('./orders-service')
const { db } = await import('@/db')
const { users, orders } = await import('@/db/schema')
const { eq } = await import('drizzle-orm')

describe('quetNhacNho', () => {
  it('chỉ nhắc đơn trong mốc 2h chưa xong, mỗi đơn nhắc đúng 1 lần', () => {
    const uid = db.insert(users).values({ username: 'q-job', passwordHash: 'x', hoTen: 'Q', vaiTro: 'quay' }).returning().get().id
    const now = Date.now()
    const gan = taoDon(donMau(now + 60 * 60 * 1000), uid)   // còn 1h → nhắc
    const xa = taoDon(donMau(now + 5 * 60 * 60 * 1000), uid) // còn 5h → chưa

    expect(quetNhacNho(now)).toBeGreaterThanOrEqual(1)
    expect(db.select().from(orders).where(eq(orders.id, gan.id)).get()!.nhacNho).toBe(1)
    expect(db.select().from(orders).where(eq(orders.id, xa.id)).get()!.nhacNho).toBe(0)
    expect(quetNhacNho(now)).toBe(0) // lần 2 không nhắc lại

    function donMau(gioNhan: number) {
      return {
        khach: { sdt: '0907777777', ten: 'Anh Bảy' }, nguon: 'dien_thoai' as const,
        ngayGioNhan: gioNhan, hinhThucNhan: 'tai_tiem' as const,
        items: [{ tenMon: 'Bánh su kem', soLuong: 1, gia: 45000 }],
      }
    }
  })
})
