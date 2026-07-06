import { db } from './index'
import { users, products, productSizes } from './schema'
import { hashPassword } from '../lib/auth'

const daCoDuLieu = db.select().from(users).all().length > 0
if (daCoDuLieu) {
  console.log('Đã có dữ liệu, bỏ qua seed.')
} else {
  db.insert(users).values({
    username: 'admin',
    passwordHash: hashPassword('admin123'),
    hoTen: 'Quản lý',
    vaiTro: 'quanly',
  }).run()

  const banhMau: [string, string, [string, number][]][] = [
    ['Bánh kem bắp', 'Bánh kem sinh nhật', [['16cm', 150000], ['20cm', 220000], ['24cm', 300000]]],
    ['Bánh kem socola', 'Bánh kem sinh nhật', [['16cm', 160000], ['20cm', 230000], ['24cm', 320000]]],
    ['Bông lan trứng muối', 'Bông lan', [['Nhỏ', 90000], ['Lớn', 160000]]],
    ['Bánh su kem', 'Bánh nhỏ', [['Hộp 6 cái', 45000], ['Hộp 12 cái', 85000]]],
  ]
  for (const [ten, nhom, sizes] of banhMau) {
    const p = db.insert(products).values({ ten, nhom }).returning().get()
    for (const [tenCo, gia] of sizes) {
      db.insert(productSizes).values({ productId: p.id, tenCo, gia }).run()
    }
  }
  console.log('Seed xong: tài khoản admin/admin123 + 4 bánh mẫu.')
}
