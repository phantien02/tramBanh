import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { users, products, banhOptions } from './schema'
import { hashPassword } from '../lib/auth'
import { SAN_PHAM_MAU } from '../lib/seed-const'

// Danh sách vị mặc định cho sản phẩm mẫu
const VI_MAC_DINH: { loai: 'cot' | 'mut' | 'topping' | 'size'; ten: string }[] = [
  ...['Vanilla', 'Chocolate', 'Matcha', 'Red Velvet'].map((ten) => ({ loai: 'cot' as const, ten })),
  ...['Chanh leo', 'Dâu tây', 'Xoài', 'Đào', 'Việt quất', 'Sốt đường đen', 'Sốt socola'].map((ten) => ({ loai: 'mut' as const, ten })),
  ...['Trái cây hỗn hợp theo mùa', 'Trân châu đường đen', 'Marshmallow', 'Oreo vụn'].map((ten) => ({ loai: 'topping' as const, ten })),
  ...['T10', 'C12', 'T12', 'C14', 'T14', 'C16', 'T16', 'C18', 'T18'].map((ten) => ({ loai: 'size' as const, ten })),
]

// Tạo dữ liệu nền tối thiểu nếu DB còn trống. Idempotent — an toàn gọi mỗi lần khởi động.
// Nhờ vậy container deploy mới (DB rỗng) tự có admin + sản phẩm mẫu + vị, không cần chạy script seed.
export function seedNeuTrong(db: BetterSQLite3Database<typeof schema>): void {
  // 1) Tài khoản admin — onConflictDoNothing để an toàn nếu bị gọi song song
  if (db.select().from(users).all().length === 0) {
    db.insert(users).values({
      username: 'admin', passwordHash: hashPassword('admin123'), hoTen: 'Quản lý', vaiTro: 'quanly',
    }).onConflictDoNothing().run()
    console.log('Seed: tạo tài khoản admin/admin123.')
  }

  // 2) Sản phẩm mẫu
  if (!db.select().from(products).where(eq(products.ten, SAN_PHAM_MAU)).get()) {
    db.insert(products).values({ ten: SAN_PHAM_MAU, nhom: 'Bánh kem sinh nhật' }).run()
    console.log(`Seed: tạo sản phẩm "${SAN_PHAM_MAU}".`)
  }

  // 3) Danh sách vị mặc định
  if (db.select().from(banhOptions).all().length === 0) {
    VI_MAC_DINH.forEach((v, i) => db.insert(banhOptions).values({ ...v, thuTu: i }).run())
    console.log(`Seed: tạo ${VI_MAC_DINH.length} vị mặc định (cốt/mứt/topping/size).`)
  }
}
