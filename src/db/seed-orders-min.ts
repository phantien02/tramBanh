/**
 * Seed dữ liệu test GỌN: xóa hết đơn cũ, tạo 5 đơn/ngày cho 3 ngày gần nhất
 * (hôm nay + 2 hôm trước). Đơn quá khứ → hoàn tất (có doanh thu); đơn hôm nay
 * trải đủ trạng thái moi/dang_lam/banh_xong/da_nhan/hoan_tat với giờ lấy đa dạng
 * (trễ hạn / sắp đến hạn) để test màu + note.
 * Ảnh mẫu: tái dùng seed-anh-*.jpg đã có trong data/uploads (không tải mạng).
 * Chạy: npm run db:seed-orders-min
 */
import fs from 'fs'
import path from 'path'
import { eq, inArray } from 'drizzle-orm'
import { db, sqlite } from './index'
import { orders, orderItems, orderItemImages, orderEvents, customers, products, banhOptions } from './schema'
import { SAN_PHAM_MAU } from '../lib/seed-const'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const UPLOADS = path.join(DATA_DIR, 'uploads')

const rnd = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(a: T[]): T => a[rnd(a.length)]
const round1k = (n: number) => Math.round(n / 1000) * 1000

const GIA_SIZE: Record<string, number> = {
  T10: 150000, C12: 230000, T12: 210000, C14: 290000, T14: 260000,
  C16: 370000, T16: 340000, C18: 520000, T18: 480000,
}
const CHU_VIET = ['Happy Birthday', 'Chúc mừng sinh nhật', 'Mừng thọ Bà', 'Love you Mom', 'Chúc mừng bé 1 tuổi']
const GHI_CHU = ['Ít ngọt', 'Đổi hoa hồng đỏ', 'Ghi tên bằng chữ vàng', 'Trang trí tông pastel']
const DIA_CHI = ['Trần Duy Hưng', 'Cầu Giấy', 'Kim Mã', 'Thái Hà', 'Tây Sơn']

function main() {
  // Ảnh mẫu có sẵn trong uploads
  const anhPool = fs.existsSync(UPLOADS)
    ? fs.readdirSync(UPLOADS).filter((f) => f.startsWith('seed-anh-') && f.endsWith('.jpg'))
    : []
  console.log(`Ảnh mẫu tái dùng: ${anhPool.length}`)

  const sp = db.select().from(products).where(eq(products.ten, SAN_PHAM_MAU)).get()
  const cot = db.select().from(banhOptions).where(eq(banhOptions.loai, 'cot')).all().map((o) => o.ten)
  const mut = db.select().from(banhOptions).where(eq(banhOptions.loai, 'mut')).all().map((o) => o.ten)
  const sizes = db.select().from(banhOptions).where(eq(banhOptions.loai, 'size')).all().map((o) => o.ten)
  const adminId = (sqlite.prepare('select id from users order by id limit 1').get() as { id: number } | undefined)?.id ?? 1

  // Khách: dùng lại nếu có, không thì tạo vài khách
  let khachIds = db.select({ id: customers.id }).from(customers).all().map((r) => r.id)
  if (khachIds.length < 8) {
    const ten = ['Cô Lan', 'Anh Minh', 'Chị Hương', 'Bác Hòa', 'Chị Mai', 'Anh Tuấn', 'Cô Vy', 'Chú Sơn']
    const created: number[] = []
    sqlite.transaction(() => {
      ten.forEach((t, i) => {
        const sdt = '09' + String(10000000 + i).padStart(8, '0')
        const row = db.insert(customers).values({ sdt, ten: t }).returning().get()
        created.push(row.id)
      })
    })()
    khachIds = khachIds.concat(created)
  }

  // Xóa toàn bộ đơn cũ + con
  sqlite.transaction(() => {
    const its = db.select({ id: orderItems.id }).from(orderItems).all().map((r) => r.id)
    if (its.length) db.delete(orderItemImages).where(inArray(orderItemImages.orderItemId, its)).run()
    db.delete(orderEvents).run()
    db.delete(orderItems).run()
    db.delete(orders).run()
  })()

  const now = Date.now()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const demNgay = new Map<string, number>()
  function nextMa(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const key = dd + mm
    const n = (demNgay.get(key) ?? 0) + 1
    demNgay.set(key, n)
    return `#${dd}${mm}-${String(n).padStart(2, '0')}`
  }

  // Trạng thái + phút lệch so với "giờ lấy" cho 5 đơn hôm nay (test màu/note)
  const HOM_NAY: { tt: string; lech: number }[] = [
    { tt: 'moi', lech: +90 },       // còn ~1h30
    { tt: 'dang_lam', lech: -30 },  // trễ 30 phút (đỏ báo động)
    { tt: 'banh_xong', lech: +40 }, // sắp đến hạn
    { tt: 'da_nhan', lech: +180 },  // còn xa
    { tt: 'hoan_tat', lech: -180 }, // đã xong
  ]

  let daTao = 0
  sqlite.transaction(() => {
    for (let back = 2; back >= 0; back--) {
      const ngay = new Date(today.getTime() - back * 86400000)
      const laHomNay = back === 0
      for (let k = 0; k < 5; k++) {
        let pickup: number, trangThai: string
        if (laHomNay) {
          trangThai = HOM_NAY[k].tt
          pickup = now + HOM_NAY[k].lech * 60000
        } else {
          trangThai = 'hoan_tat'
          const gio = 8 + rnd(11); const phut = pick([0, 15, 30, 45])
          pickup = new Date(ngay.getFullYear(), ngay.getMonth(), ngay.getDate(), gio, phut).getTime()
        }
        const createdAt = pickup - (2 + rnd(20)) * 3600000
        const ship = k % 2 === 0
        const phiShip = ship ? pick([15000, 20000, 25000, 30000]) : 0
        const ketThucKieu = trangThai === 'hoan_tat' ? (ship ? 'da_ship' : pick(['giao_khach', 'len_tu'])) : null
        const nguoiLam = trangThai === 'moi' ? null : adminId
        const nguoiGiao = trangThai === 'hoan_tat' ? adminId : null

        const soMon = k % 3 === 0 ? 2 : 1
        const itemsData = Array.from({ length: soMon }, () => {
          const size = pick(sizes)
          const gia = round1k((GIA_SIZE[size] ?? 300000) * (0.95 + Math.random() * 0.15))
          const anh: string[] = anhPool.length && Math.random() < 0.7 ? [pick(anhPool)] : []
          return {
            size, cot: pick(cot), mut: Math.random() < 0.8 ? pick(mut) : null,
            soLuong: Math.random() < 0.75 ? 1 : 2, gia,
            chuViet: Math.random() < 0.6 ? pick(CHU_VIET) : null,
            ghiChu: Math.random() < 0.3 ? pick(GHI_CHU) : null, anh,
          }
        })
        const tongTien = itemsData.reduce((s, it) => s + it.gia * it.soLuong, 0) + phiShip
        const tienCoc = Math.random() < 0.5 ? 0 : round1k(tongTien * pick([0.3, 0.5]))
        const created = new Date(createdAt)
        const maDon = nextMa(created)

        const don = db.insert(orders).values({
          maDon, customerId: pick(khachIds), nguon: pick(['tai_quay', 'zalo', 'messenger', 'dien_thoai']) as never,
          ngayGioNhan: pickup, hinhThucNhan: (ship ? 'ship' : 'tai_tiem') as never,
          diaChiShip: ship ? `${1 + rnd(200)} ${pick(DIA_CHI)}, Hà Nội` : null,
          phiShip, tongTien, tienCoc,
          hinhThucTt: (trangThai === 'hoan_tat' ? pick(['tien_mat', 'chuyen_khoan']) : 'chua_tt') as never,
          ghiChu: Math.random() < 0.3 ? pick(GHI_CHU) : null,
          trangThai: trangThai as never, ketThucKieu: ketThucKieu as never,
          nguoiTao: adminId, nguoiLam, nguoiGiao, createdAt,
        }).returning().get()

        for (const it of itemsData) {
          const row = db.insert(orderItems).values({
            orderId: don.id, productId: sp?.id ?? null, tenMon: SAN_PHAM_MAU, coBanh: it.size,
            cot: it.cot, mut: it.mut, topping: JSON.stringify([]),
            soLuong: it.soLuong, chuViet: it.chuViet, ghiChu: it.ghiChu, gia: it.gia,
          }).returning().get()
          for (const f of it.anh) db.insert(orderItemImages).values({ orderItemId: row.id, filePath: f }).run()
        }
        db.insert(orderEvents).values({ orderId: don.id, userId: adminId, hanhDong: 'tao_don', thoiDiem: createdAt }).run()
        if (trangThai === 'hoan_tat') {
          db.insert(orderEvents).values({ orderId: don.id, userId: adminId, hanhDong: 'chuyen:da_nhan->hoan_tat', chiTiet: ketThucKieu, thoiDiem: pickup - rnd(60) * 60000 }).run()
        }
        daTao++
      }
    }
  })()

  const bd = db.select().from(orders).all()
  const dem = (t: string) => bd.filter((o) => o.trangThai === t).length
  console.log(`✅ Đã tạo ${daTao} đơn (3 ngày × 5).`)
  console.log(`   Trạng thái: hoàn tất ${dem('hoan_tat')}, mới ${dem('moi')}, đang làm ${dem('dang_lam')}, bánh xong ${dem('banh_xong')}, đã nhận ${dem('da_nhan')}.`)
}

main()
process.exit(0)
