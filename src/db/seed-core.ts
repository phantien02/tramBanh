import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { users, products, banhOptions, phuKien } from './schema'
import { hashPassword } from '../lib/auth'
import { SAN_PHAM_MAU } from '../lib/seed-const'

// Danh sách vị mặc định cho sản phẩm mẫu (kèm phụ thu theo bảng giá — quản lý sửa được sau)
type ViSeed = { loai: 'cot' | 'mut' | 'topping' | 'size' | 'kem'; ten: string; phuThuKieu?: 'phan_tram' | 'tien'; phuThuGiaTri?: number }
const VI_MAC_DINH: ViSeed[] = [
  { loai: 'cot', ten: 'Vanilla' },
  { loai: 'cot', ten: 'Chocolate', phuThuKieu: 'phan_tram', phuThuGiaTri: 10 },
  { loai: 'cot', ten: 'Matcha', phuThuKieu: 'phan_tram', phuThuGiaTri: 10 },
  { loai: 'cot', ten: 'Red Velvet', phuThuKieu: 'phan_tram', phuThuGiaTri: 10 },
  // Kem (phủ) — mới, chưa dùng nhiều: sẵn 1 option miễn phí, thêm vị + phụ thu sau
  { loai: 'kem', ten: 'Kem mặc định' },
  { loai: 'mut', ten: 'Chanh leo' },
  { loai: 'mut', ten: 'Dâu tây' },
  { loai: 'mut', ten: 'Xoài' },
  { loai: 'mut', ten: 'Đào', phuThuKieu: 'tien', phuThuGiaTri: 5000 },
  { loai: 'mut', ten: 'Việt quất', phuThuKieu: 'tien', phuThuGiaTri: 5000 },
  { loai: 'mut', ten: 'Sốt đường đen', phuThuKieu: 'tien', phuThuGiaTri: 10000 },
  { loai: 'mut', ten: 'Sốt socola', phuThuKieu: 'tien', phuThuGiaTri: 10000 },
  { loai: 'topping', ten: 'Trái cây hỗn hợp theo mùa', phuThuKieu: 'phan_tram', phuThuGiaTri: 10 },
  { loai: 'topping', ten: 'Trân châu đường đen', phuThuKieu: 'phan_tram', phuThuGiaTri: 5 },
  { loai: 'topping', ten: 'Marshmallow', phuThuKieu: 'phan_tram', phuThuGiaTri: 5 },
  { loai: 'topping', ten: 'Oreo vụn', phuThuKieu: 'phan_tram', phuThuGiaTri: 5 },
  ...['T10', 'C12', 'T12', 'C14', 'T14', 'C16', 'T16', 'C18', 'T18'].map((ten) => ({ loai: 'size' as const, ten })),
]

// Phụ kiện mua thêm mặc định — quản lý sửa giá/thêm bớt ở màn Quản lý > Sản phẩm
const PHU_KIEN_MAC_DINH: { ten: string; gia: number }[] = [
  { ten: 'Nến', gia: 5000 },
  { ten: 'Mũ', gia: 10000 },
  { ten: 'Pháo', gia: 15000 },
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
    console.log(`Seed: tạo ${VI_MAC_DINH.length} vị mặc định (cốt/kem/mứt/topping/size).`)
  }

  // 3b) Đảm bảo luôn có sẵn 1 vị "Kem mặc định" (miễn phí) — chạy cả trên DB cũ đã có
  //     dữ liệu (nơi bước 3 bị bỏ qua). Idempotent: chỉ thêm khi chưa có vị kem nào.
  if (db.select().from(banhOptions).where(eq(banhOptions.loai, 'kem')).all().length === 0) {
    db.insert(banhOptions).values({ loai: 'kem', ten: 'Kem mặc định', thuTu: 0 }).run()
    console.log('Seed: tạo vị "Kem mặc định" (miễn phí).')
  }

  // 4) Phụ kiện mặc định
  if (db.select().from(phuKien).all().length === 0) {
    PHU_KIEN_MAC_DINH.forEach((p, i) => db.insert(phuKien).values({ ...p, thuTu: i }).run())
    console.log(`Seed: tạo ${PHU_KIEN_MAC_DINH.length} phụ kiện mặc định (nến/mũ/pháo).`)
  }
}
