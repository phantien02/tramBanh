import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm'
import { db, sqlite } from '@/db'
import { customers, orders, orderItems, orderItemImages, orderEvents, users } from '@/db/schema'
import { chuyenHopLe, type TrangThai } from './status'
import { taoMaDon } from './order-code'
import { tinhTongTien } from './money'
import { dauCuoiNgay } from './time'
import { phatSuKien } from './sse'
import type { SessionUser } from './session'

type Nguon = 'tai_quay' | 'zalo' | 'messenger' | 'dien_thoai' | 'khac'
type HinhThucNhan = 'tai_tiem' | 'ship' | 'tu_trung_bay'
type HinhThucTt = 'tien_mat' | 'chuyen_khoan' | 'chua_tt'
type KetThucKieu = 'giao_khach' | 'da_ship' | 'len_tu'

export type DonMoi = {
  khach: { sdt: string; ten: string }
  nguon: Nguon
  ngayGioNhan: number
  hinhThucNhan: HinhThucNhan
  diaChiShip?: string
  tenNguoiNhan?: string
  sdtNguoiNhan?: string
  phiShip?: number
  kieuPhiShip?: 'freeship' | 'theo_app'
  tienCoc?: number
  hinhThucTt?: HinhThucTt
  ghiChu?: string
  tongTienGhiDe?: number
  items: { productId?: number; tenMon: string; coBanh?: string; cot?: string; mut?: string; topping?: string[]; soLuong: number; chuViet?: string; ghiChu?: string; gia: number; anhMau?: string[] }[]
}

function ghiEvent(orderId: number, userId: number | null, hanhDong: string, chiTiet?: string) {
  db.insert(orderEvents).values({ orderId, userId, hanhDong, chiTiet, thoiDiem: Date.now() }).run()
}

function upsertKhach(sdt: string, ten: string): number {
  const cu = db.select().from(customers).where(eq(customers.sdt, sdt)).get()
  if (cu) {
    if (cu.ten !== ten) db.update(customers).set({ ten }).where(eq(customers.id, cu.id)).run()
    return cu.id
  }
  return db.insert(customers).values({ sdt, ten }).returning().get().id
}

function chenItems(orderId: number, items: DonMoi['items']) {
  for (const it of items) {
    const row = db.insert(orderItems).values({
      orderId, productId: it.productId ?? null, tenMon: it.tenMon, coBanh: it.coBanh,
      cot: it.cot, mut: it.mut, topping: JSON.stringify(it.topping ?? []),
      soLuong: it.soLuong, chuViet: it.chuViet, ghiChu: it.ghiChu, gia: it.gia,
    }).returning().get()
    for (const f of it.anhMau ?? []) {
      db.insert(orderItemImages).values({ orderItemId: row.id, filePath: f }).run()
    }
  }
}

// khi không ship, dọn các trường liên quan ship để không lưu dữ liệu cũ/rác
// (dùng null thay vì undefined vì set()/values() của drizzle bỏ qua field undefined thay vì xóa)
function chuanHoaShip(data: DonMoi): DonMoi {
  if (data.hinhThucNhan === 'ship') return data
  return { ...data, diaChiShip: null as unknown as undefined, tenNguoiNhan: null as unknown as undefined, sdtNguoiNhan: null as unknown as undefined, phiShip: 0, kieuPhiShip: null as unknown as undefined }
}

export function taoDon(data: DonMoi, userId: number): { id: number; maDon: string } {
  data = chuanHoaShip(data)
  const kq = sqlite.transaction(() => {
    const now = new Date()
    const { dau, cuoi } = dauCuoiNgay(now)
    const soTrongNgay = db.select({ n: sql<number>`count(*)` }).from(orders)
      .where(and(gte(orders.createdAt, dau), lte(orders.createdAt, cuoi))).get()!.n
    const maDon = taoMaDon(now, soTrongNgay + 1)
    const tongTien = data.tongTienGhiDe ?? tinhTongTien(data.items, data.phiShip ?? 0)
    const customerId = upsertKhach(data.khach.sdt, data.khach.ten)

    const don = db.insert(orders).values({
      maDon, customerId, nguon: data.nguon, ngayGioNhan: data.ngayGioNhan,
      hinhThucNhan: data.hinhThucNhan, diaChiShip: data.diaChiShip,
      tenNguoiNhan: data.tenNguoiNhan, sdtNguoiNhan: data.sdtNguoiNhan,
      phiShip: data.phiShip ?? 0, kieuPhiShip: data.kieuPhiShip, tongTien, tienCoc: data.tienCoc ?? 0,
      hinhThucTt: data.hinhThucTt ?? 'chua_tt', ghiChu: data.ghiChu,
      nguoiTao: userId, createdAt: Date.now(),
    }).returning().get()
    chenItems(don.id, data.items)
    ghiEvent(don.id, userId, 'tao_don')
    return { id: don.id, maDon }
  })()
  phatSuKien({ type: 'don_moi', orderId: kq.id, maDon: kq.maDon, trangThai: 'moi' })
  return kq
}

export function suaDon(id: number, data: DonMoi, userId: number): { ok: boolean; loi?: string } {
  data = chuanHoaShip(data)
  const kq = sqlite.transaction(() => {
    const don = db.select().from(orders).where(eq(orders.id, id)).get()
    if (!don) return { ok: false as const, loi: 'Không tìm thấy đơn' }
    if (don.trangThai === 'hoan_tat' || don.trangThai === 'huy') return { ok: false as const, loi: 'Đơn đã kết thúc, không sửa được' }

    const tongTien = data.tongTienGhiDe ?? tinhTongTien(data.items, data.phiShip ?? 0)
    const daSua = don.trangThai === 'dang_lam' || don.trangThai === 'banh_xong' ? 1 : don.daSua
    db.update(orders).set({
      customerId: upsertKhach(data.khach.sdt, data.khach.ten),
      nguon: data.nguon, ngayGioNhan: data.ngayGioNhan, hinhThucNhan: data.hinhThucNhan,
      diaChiShip: data.diaChiShip, tenNguoiNhan: data.tenNguoiNhan, sdtNguoiNhan: data.sdtNguoiNhan, phiShip: data.phiShip ?? 0, kieuPhiShip: data.kieuPhiShip,
      tongTien, tienCoc: data.tienCoc ?? 0, hinhThucTt: data.hinhThucTt ?? 'chua_tt',
      ghiChu: data.ghiChu, daSua,
    }).where(eq(orders.id, id)).run()

    // thay toàn bộ items (xóa ảnh con trước vì FK)
    const itemIds = db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, id)).all().map((r) => r.id)
    if (itemIds.length) db.delete(orderItemImages).where(inArray(orderItemImages.orderItemId, itemIds)).run()
    db.delete(orderItems).where(eq(orderItems.orderId, id)).run()
    chenItems(id, data.items)

    ghiEvent(id, userId, 'sua_don')
    return { ok: true as const, maDon: don.maDon, trangThai: don.trangThai }
  })()

  if (kq.ok) phatSuKien({ type: 'don_cap_nhat', orderId: id, maDon: kq.maDon, trangThai: kq.trangThai })
  return kq.ok ? { ok: true } : { ok: false, loi: kq.loi }
}

export function chuyenTrangThai(
  id: number, to: TrangThai, user: SessionUser,
  opts?: { ketThucKieu?: KetThucKieu; lyDoHuy?: string },
): { ok: true } | { ok: false; loi: string } {
  const don = db.select().from(orders).where(eq(orders.id, id)).get()
  if (!don) return { ok: false, loi: 'Không tìm thấy đơn' }
  const from = don.trangThai as TrangThai
  if (!chuyenHopLe(from, to, user.vaiTro)) return { ok: false, loi: 'Bước chuyển không hợp lệ với vai trò của bạn' }
  if (to === 'hoan_tat' && !opts?.ketThucKieu) return { ok: false, loi: 'Chọn hình thức kết thúc (giao khách / đã ship / lên tủ)' }
  if (to === 'huy' && !opts?.lyDoHuy) return { ok: false, loi: 'Nhập lý do hủy' }

  const set: Record<string, unknown> = { trangThai: to }
  if (to === 'dang_lam') set.nguoiLam = user.id
  if (to === 'hoan_tat') { set.nguoiGiao = user.id; set.ketThucKieu = opts!.ketThucKieu }
  if (to === 'huy') set.lyDoHuy = opts!.lyDoHuy
  if (to === 'da_nhan' || to === 'hoan_tat') set.daSua = 0

  // UPDATE có điều kiện trạng thái cũ — chống 2 người bấm đồng thời
  const kq = db.update(orders).set(set).where(and(eq(orders.id, id), eq(orders.trangThai, from))).run()
  if (kq.changes === 0) return { ok: false, loi: 'Đơn vừa được người khác xử lý, hãy tải lại' }

  ghiEvent(id, user.id, `chuyen:${from}->${to}`, opts?.lyDoHuy ?? opts?.ketThucKieu)
  phatSuKien({ type: 'chuyen_trang_thai', orderId: id, maDon: don.maDon, trangThai: to })
  return { ok: true }
}

export function xacNhanSua(id: number, userId: number): void {
  db.update(orders).set({ daSua: 0 }).where(eq(orders.id, id)).run()
  ghiEvent(id, userId, 'bep_xac_nhan_da_thay_sua')
}

export function layDanhSachDon(loc: { tuNgay?: number; denNgay?: number; trangThai?: string[]; q?: string }) {
  const dieuKien = []
  if (loc.tuNgay != null) dieuKien.push(gte(orders.ngayGioNhan, loc.tuNgay))
  if (loc.denNgay != null) dieuKien.push(lte(orders.ngayGioNhan, loc.denNgay))
  if (loc.trangThai?.length) dieuKien.push(inArray(orders.trangThai, loc.trangThai as TrangThai[]))

  let ds = db.select().from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(dieuKien.length ? and(...dieuKien) : undefined)
    .orderBy(orders.ngayGioNhan)
    .all()

  if (loc.q) {
    const q = loc.q.toLowerCase()
    ds = ds.filter((r) =>
      r.orders.maDon.toLowerCase().includes(q) ||
      (r.customers?.ten ?? '').toLowerCase().includes(q) ||
      (r.customers?.sdt ?? '').includes(q))
  }

  return ds.map((r) => {
    const items = db.select().from(orderItems).where(eq(orderItems.orderId, r.orders.id)).all()
      .map((it) => ({
        ...it,
        topping: it.topping ? (JSON.parse(it.topping) as string[]) : [],
        anhMau: db.select().from(orderItemImages).where(eq(orderItemImages.orderItemId, it.id)).all().map((a) => a.filePath),
      }))
    return { ...r.orders, khach: r.customers, items }
  })
}

export function layChiTietDon(id: number) {
  const [don] = layDanhSachDonTheoId(id)
  if (!don) return null
  const events = db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(orderEvents.thoiDiem).all()
    .map((e) => ({
      ...e,
      tenNguoiThucHien: e.userId == null ? 'Hệ thống' : (db.select({ hoTen: users.hoTen }).from(users).where(eq(users.id, e.userId)).get()?.hoTen ?? 'Hệ thống'),
    }))
  return { ...don, events }
}

function layDanhSachDonTheoId(id: number) {
  const r = db.select().from(orders).leftJoin(customers, eq(orders.customerId, customers.id)).where(eq(orders.id, id)).get()
  if (!r) return []
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, id)).all()
    .map((it) => ({
      ...it,
      topping: it.topping ? (JSON.parse(it.topping) as string[]) : [],
      anhMau: db.select().from(orderItemImages).where(eq(orderItemImages.orderItemId, it.id)).all().map((a) => a.filePath),
    }))
  return [{ ...r.orders, khach: r.customers, items }]
}
