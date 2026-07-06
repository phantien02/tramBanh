import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderEvents } from '@/db/schema'
import { canNhacNho } from './reminder'
import { phatSuKien } from './sse'

export function quetNhacNho(now: number): number {
  const ungVien = db.select().from(orders)
    .where(and(inArray(orders.trangThai, ['moi', 'dang_lam']), eq(orders.nhacNho, 0)))
    .all()
  let dem = 0
  for (const don of ungVien) {
    if (!canNhacNho(don, now)) continue
    db.update(orders).set({ nhacNho: 1 }).where(eq(orders.id, don.id)).run()
    db.insert(orderEvents).values({
      orderId: don.id, userId: null,
      hanhDong: 'nhac_nho_2_tieng', thoiDiem: now,
    }).run()
    phatSuKien({ type: 'nhac_nho', orderId: don.id, maDon: don.maDon, trangThai: don.trangThai })
    dem++
  }
  return dem
}
