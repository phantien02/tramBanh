/**
 * Sinh dữ liệu test: ~700 đơn từ 01/06 đến 30/07 (năm hiện tại), mỗi ngày ngẫu nhiên 0–15 đơn.
 * Đơn quá khứ → hoàn tất (có doanh thu); đơn hôm nay/tương lai → mới/đang làm/... (để test bảng Quầy/Bếp).
 * Ảnh mẫu tải từ internet (loremflickr, keyword cake); nếu lỗi mạng → sinh ảnh placeholder bằng sharp.
 * Chạy: npm run db:seed-orders
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { eq, inArray } from 'drizzle-orm'
import { db, sqlite } from './index'
import { orders, orderItems, orderItemImages, orderEvents, customers, products, banhOptions } from './schema'
import { SAN_PHAM_MAU } from '../lib/seed-const'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const UPLOADS = path.join(DATA_DIR, 'uploads')
const MUC_TIEU = 700
const SO_ANH_POOL = 16

// ── tiện ích random ──
const rnd = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(a: T[]): T => a[rnd(a.length)]
const chance = (p: number) => Math.random() < p
const round1k = (n: number) => Math.round(n / 1000) * 1000
function pickNhieu<T>(a: T[], toiDa: number): T[] {
  const n = rnd(toiDa + 1)
  const copy = [...a]; const out: T[] = []
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(rnd(copy.length), 1)[0])
  return out
}

const GIA_SIZE: Record<string, number> = {
  T10: 150000, C12: 230000, T12: 210000, C14: 290000, T14: 260000,
  C16: 370000, T16: 340000, C18: 520000, T18: 480000,
}
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý']
const DEM = ['Thị', 'Văn', 'Minh', 'Thu', 'Hoàng', 'Ngọc', 'Gia', 'Khánh', 'Thanh', 'Quốc', 'Hải', 'Phương']
const TEN = ['An', 'Bình', 'Chi', 'Dung', 'Hương', 'Lan', 'Mai', 'Nam', 'Oanh', 'Phúc', 'Quân', 'Sơn', 'Trang', 'Vy', 'Yến', 'Hà', 'Linh', 'Tú', 'Đạt', 'Hiếu']
const DIA_CHI = ['Trần Duy Hưng', 'Nguyễn Trãi', 'Cầu Giấy', 'Kim Mã', 'Láng Hạ', 'Xuân Thủy', 'Hoàng Quốc Việt', 'Tây Sơn', 'Thái Hà', 'Nguyễn Chí Thanh']
const CHU_VIET = ['Happy Birthday', 'Chúc mừng sinh nhật', 'HPBD Bé Na', 'Mừng thọ Bà', 'Chúc mừng 20/10', 'Love you Mom', 'Sinh nhật vui vẻ', 'Chúc mừng bé 1 tuổi']
const GHI_CHU = ['Ít ngọt', 'Đổi hoa hồng đỏ', 'Không dùng socola đắng', 'Ghi tên bằng chữ vàng', 'Trang trí tông pastel', 'Giao trước 30 phút']
const LY_DO_HUY = ['Khách đổi ý', 'Trùng đơn', 'Khách không nhận', 'Hết nguyên liệu']

// ── ảnh mẫu ──
async function taiAnhPool(): Promise<string[]> {
  const ten: string[] = []
  for (let i = 0; i < SO_ANH_POOL; i++) {
    try {
      const res = await fetch(`https://loremflickr.com/800/800/cake,birthdaycake?lock=${i + 1}`, { redirect: 'follow' })
      if (!res.ok) throw new Error('http ' + res.status)
      const buf = Buffer.from(await res.arrayBuffer())
      const jpg = await sharp(buf).resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
      const f = `seed-anh-${i}.jpg`
      fs.writeFileSync(path.join(UPLOADS, f), jpg)
      ten.push(f)
    } catch { /* bỏ qua ảnh lỗi */ }
  }
  if (ten.length === 0) {
    console.log('  ⚠ Không tải được ảnh từ mạng — sinh ảnh placeholder.')
    const mau = [[247, 214, 200], [251, 227, 201], [214, 240, 226], [230, 224, 245], [252, 236, 214]]
    for (let i = 0; i < SO_ANH_POOL; i++) {
      const [r, g, b] = mau[i % mau.length]
      const svg = Buffer.from(`<svg width="800" height="800"><rect width="800" height="800" fill="rgb(${r},${g},${b})"/><text x="400" y="410" font-size="60" text-anchor="middle" fill="#2B2119" font-family="sans-serif">🎂 Bánh mẫu ${i + 1}</text></svg>`)
      const jpg = await sharp(svg).jpeg({ quality: 80 }).toBuffer()
      const f = `seed-anh-${i}.jpg`
      fs.writeFileSync(path.join(UPLOADS, f), jpg)
      ten.push(f)
    }
  }
  return ten
}

async function main() {
  // dọn dữ liệu seed cũ (nếu chạy lại) — xoá đơn + con của nó, giữ user/options/sản phẩm mẫu
  const cu = db.select({ id: orders.id }).from(orders).all().map((r) => r.id)
  if (cu.length) {
    console.log(`Xoá ${cu.length} đơn cũ để seed lại...`)
    sqlite.transaction(() => {
      const its = db.select({ id: orderItems.id }).from(orderItems).all().map((r) => r.id)
      if (its.length) db.delete(orderItemImages).where(inArray(orderItemImages.orderItemId, its)).run()
      db.delete(orderEvents).run()
      db.delete(orderItems).run()
      db.delete(orders).run()
    })()
  }

  console.log(`Tải ${SO_ANH_POOL} ảnh mẫu...`)
  const anhPool = await taiAnhPool()
  console.log(`  → ${anhPool.length} ảnh sẵn sàng.`)

  const sp = db.select().from(products).where(eq(products.ten, SAN_PHAM_MAU)).get()
  const cot = db.select().from(banhOptions).where(eq(banhOptions.loai, 'cot')).all().map((o) => o.ten)
  const mut = db.select().from(banhOptions).where(eq(banhOptions.loai, 'mut')).all().map((o) => o.ten)
  const topping = db.select().from(banhOptions).where(eq(banhOptions.loai, 'topping')).all().map((o) => o.ten)
  const sizes = db.select().from(banhOptions).where(eq(banhOptions.loai, 'size')).all().map((o) => o.ten)

  // tài khoản tạo đơn = user đầu tiên
  const adminId = (() => {
    const u = sqlite.prepare('select id from users order by id limit 1').get() as { id: number } | undefined
    return u?.id ?? 1
  })()

  // ── khách hàng ──
  const soKhach = 90
  const sdtDaCo = new Set(db.select({ s: customers.sdt }).from(customers).all().map((r) => r.s))
  const khachIds: number[] = db.select({ id: customers.id }).from(customers).all().map((r) => r.id)
  sqlite.transaction(() => {
    for (let i = 0; i < soKhach; i++) {
      let sdt = ''
      do { sdt = '09' + String(rnd(100000000)).padStart(8, '0') } while (sdtDaCo.has(sdt))
      sdtDaCo.add(sdt)
      const ten = `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`
      const row = db.insert(customers).values({ sdt, ten }).returning().get()
      khachIds.push(row.id)
    }
  })()

  // ── ngày: 01/06 → 30/07 năm hiện tại; số đơn/ngày 0..15, tổng ~MUC_TIEU ──
  const now = Date.now()
  const YEAR = new Date().getFullYear()
  const ngayList: Date[] = []
  for (let d = new Date(YEAR, 5, 1); d <= new Date(YEAR, 6, 30); d = new Date(d.getTime() + 86400000)) {
    ngayList.push(new Date(d))
  }
  const soMoiNgay = ngayList.map(() => rnd(16)) // 0..15
  let tong = soMoiNgay.reduce((a, b) => a + b, 0)
  // điều chỉnh về ~MUC_TIEU, giữ trần 15/ngày
  while (tong < MUC_TIEU) { const i = rnd(soMoiNgay.length); if (soMoiNgay[i] < 15) { soMoiNgay[i]++; tong++ } }
  while (tong > MUC_TIEU) { const i = rnd(soMoiNgay.length); if (soMoiNgay[i] > 0) { soMoiNgay[i]--; tong-- } }

  // mã đơn không trùng
  const maDaCo = new Set(db.select({ m: orders.maDon }).from(orders).all().map((r) => r.m))
  const demNgay = new Map<string, number>()
  function nextMa(created: Date): string {
    const dd = String(created.getDate()).padStart(2, '0')
    const mm = String(created.getMonth() + 1).padStart(2, '0')
    const key = dd + mm
    let n = demNgay.get(key) ?? 0
    let ma = ''
    do { n++; ma = `#${dd}${mm}-${String(n).padStart(2, '0')}` } while (maDaCo.has(ma))
    demNgay.set(key, n); maDaCo.add(ma)
    return ma
  }

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  let daTao = 0

  sqlite.transaction(() => {
    ngayList.forEach((ngay, idx) => {
      for (let k = 0; k < soMoiNgay[idx]; k++) {
        const gio = 7 + rnd(14) // 7..20
        const phut = pick([0, 15, 30, 45])
        const pickup = new Date(ngay.getFullYear(), ngay.getMonth(), ngay.getDate(), gio, phut).getTime()
        const createdAt = Math.max(new Date(YEAR, 5, 1).getTime(), pickup - (2 + rnd(46)) * 3600000)

        // trạng thái theo mốc thời gian
        let trangThai: string, ketThucKieu: string | null = null, lyDoHuy: string | null = null
        let nguoiLam: number | null = null, nguoiGiao: number | null = null
        if (pickup < startToday.getTime()) {
          const r = Math.random()
          if (r < 0.88) { trangThai = 'hoan_tat'; nguoiLam = adminId; nguoiGiao = adminId }
          else if (r < 0.96) { trangThai = 'huy'; lyDoHuy = pick(LY_DO_HUY) }
          else { trangThai = 'da_nhan'; nguoiLam = adminId }
        } else if (pickup < now + 36 * 3600000) {
          trangThai = pick(['moi', 'dang_lam', 'dang_lam', 'banh_xong', 'da_nhan'])
          if (trangThai !== 'moi') nguoiLam = adminId
        } else {
          trangThai = chance(0.75) ? 'moi' : 'dang_lam'
          if (trangThai === 'dang_lam') nguoiLam = adminId
        }

        const ship = chance(0.4)
        const phiShip = ship ? pick([15000, 20000, 25000, 30000, 40000]) : 0
        if (trangThai === 'hoan_tat') ketThucKieu = ship ? 'da_ship' : pick(['giao_khach', 'len_tu'])

        // items
        const soMon = chance(0.7) ? 1 : chance(0.7) ? 2 : 3
        const itemsData: { size: string; cot: string; mut: string | null; topping: string[]; soLuong: number; gia: number; chuViet: string | null; ghiChu: string | null; anh: string[] }[] = []
        for (let m = 0; m < soMon; m++) {
          const size = pick(sizes)
          const gia = round1k((GIA_SIZE[size] ?? 300000) * (0.9 + Math.random() * 0.28))
          const soLuong = chance(0.72) ? 1 : chance(0.7) ? 2 : 3
          const anh: string[] = []
          if (chance(0.55) && anhPool.length) { anh.push(pick(anhPool)); if (chance(0.25)) anh.push(pick(anhPool)) }
          itemsData.push({
            size, cot: pick(cot), mut: chance(0.8) ? pick(mut) : null,
            topping: pickNhieu(topping, 3), soLuong, gia,
            chuViet: chance(0.45) ? pick(CHU_VIET) : null,
            ghiChu: chance(0.25) ? pick(GHI_CHU) : null, anh,
          })
        }
        const tongTien = itemsData.reduce((s, it) => s + it.gia * it.soLuong, 0) + phiShip
        const tienCoc = chance(0.5) ? 0 : round1k(tongTien * pick([0.3, 0.5, 0.5, 1]))

        const kh = pick(khachIds)
        const nguon = pick(['tai_quay', 'tai_quay', 'tai_quay', 'zalo', 'zalo', 'zalo', 'messenger', 'dien_thoai', 'dien_thoai', 'khac']) as string
        const created = new Date(createdAt)
        const maDon = nextMa(created)

        const don = db.insert(orders).values({
          maDon, customerId: kh, nguon: nguon as never, ngayGioNhan: pickup,
          hinhThucNhan: (ship ? 'ship' : 'tai_tiem') as never,
          diaChiShip: ship ? `${1 + rnd(200)} ${pick(DIA_CHI)}, Hà Nội` : null,
          tenNguoiNhan: ship && chance(0.5) ? `${pick(HO)} ${pick(TEN)}` : null,
          sdtNguoiNhan: ship && chance(0.5) ? '09' + String(rnd(100000000)).padStart(8, '0') : null,
          phiShip, tongTien, tienCoc,
          hinhThucTt: (trangThai === 'hoan_tat' ? pick(['tien_mat', 'chuyen_khoan']) : pick(['chua_tt', 'chua_tt', 'tien_mat', 'chuyen_khoan'])) as never,
          ghiChu: chance(0.3) ? pick(GHI_CHU) : null,
          trangThai: trangThai as never, ketThucKieu: ketThucKieu as never, lyDoHuy,
          nguoiTao: adminId, nguoiLam, nguoiGiao, createdAt,
        }).returning().get()

        for (const it of itemsData) {
          const row = db.insert(orderItems).values({
            orderId: don.id, productId: sp?.id ?? null, tenMon: SAN_PHAM_MAU, coBanh: it.size,
            cot: it.cot, mut: it.mut, topping: JSON.stringify(it.topping),
            soLuong: it.soLuong, chuViet: it.chuViet, ghiChu: it.ghiChu, gia: it.gia,
          }).returning().get()
          for (const f of it.anh) db.insert(orderItemImages).values({ orderItemId: row.id, filePath: f }).run()
        }

        // events: tạo đơn + (nếu hoàn tất) chuyển hoàn tất, ~15% trễ hạn
        db.insert(orderEvents).values({ orderId: don.id, userId: adminId, hanhDong: 'tao_don', thoiDiem: createdAt }).run()
        if (trangThai === 'hoan_tat') {
          const tre = chance(0.15)
          const thoiDiem = tre ? pickup + (10 + rnd(170)) * 60000 : pickup - rnd(120) * 60000
          db.insert(orderEvents).values({ orderId: don.id, userId: adminId, hanhDong: 'chuyen:da_nhan->hoan_tat', chiTiet: ketThucKieu, thoiDiem }).run()
        }
        daTao++
      }
    })
  })()

  console.log(`✅ Đã tạo ${daTao} đơn (${ngayList.length} ngày, ${YEAR}) + ${soKhach} khách mới.`)
  const bd = db.select().from(orders).all()
  const dem = (t: string) => bd.filter((o) => o.trangThai === t).length
  console.log(`   Trạng thái: hoàn tất ${dem('hoan_tat')}, mới ${dem('moi')}, đang làm ${dem('dang_lam')}, bánh xong ${dem('banh_xong')}, đã nhận ${dem('da_nhan')}, hủy ${dem('huy')}.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
