import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  hoTen: text('ho_ten').notNull(),
  vaiTro: text('vai_tro', { enum: ['quay', 'bep', 'quanly'] }).notNull(),
  active: integer('active').notNull().default(1),
})

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sdt: text('sdt').notNull().unique(),
  ten: text('ten').notNull(),
  ghiChu: text('ghi_chu'),
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ten: text('ten').notNull(),
  nhom: text('nhom').notNull().default('Khác'),
  anh: text('anh'),
  active: integer('active').notNull().default(1),
})

export const productSizes = sqliteTable('product_sizes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  tenCo: text('ten_co').notNull(),
  gia: integer('gia').notNull(),
})

// Danh sách vị cho "Bánh kem sinh nhật theo mẫu" — sửa được ở màn Quản lý > Sản phẩm
export const banhOptions = sqliteTable('banh_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  loai: text('loai', { enum: ['cot', 'mut', 'topping', 'size', 'kem'] }).notNull(),
  ten: text('ten').notNull(),
  thuTu: integer('thu_tu').notNull().default(0),
  active: integer('active').notNull().default(1),
  // Phụ thu khi khách chọn vị này (cộng vào giá base). null/0 = miễn phí.
  // 'phan_tram': phuThuGiaTri là % tính trên base; 'tien': phuThuGiaTri là số tiền cố định.
  phuThuKieu: text('phu_thu_kieu', { enum: ['phan_tram', 'tien'] }),
  phuThuGiaTri: integer('phu_thu_gia_tri').notNull().default(0),
})

// Danh mục phụ kiện mua thêm (nến, mũ, pháo…) — sửa được ở màn Quản lý > Sản phẩm
export const phuKien = sqliteTable('phu_kien', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ten: text('ten').notNull(),
  gia: integer('gia').notNull().default(0),
  anh: text('anh'),                 // ảnh minh họa để quầy không chọn nhầm phụ kiện
  thuTu: integer('thu_tu').notNull().default(0),
  active: integer('active').notNull().default(1),
})

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  maDon: text('ma_don').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id),
  nguon: text('nguon', { enum: ['tai_quay', 'zalo', 'messenger', 'dien_thoai', 'khac'] }).notNull(),
  ngayGioNhan: integer('ngay_gio_nhan').notNull(), // unix ms
  hinhThucNhan: text('hinh_thuc_nhan', { enum: ['tai_tiem', 'ship', 'tu_trung_bay'] }).notNull(),
  diaChiShip: text('dia_chi_ship'),
  tenNguoiNhan: text('ten_nguoi_nhan'),
  sdtNguoiNhan: text('sdt_nguoi_nhan'),
  phiShip: integer('phi_ship').notNull().default(0),
  kieuPhiShip: text('kieu_phi_ship', { enum: ['freeship', 'theo_app'] }), // null = đơn cũ nhập phí ship bằng số
  donQuaTang: integer('don_qua_tang').notNull().default(0), // 1 = đơn ship là quà khách đặt tặng người nhận

  tongTien: integer('tong_tien').notNull(),
  tienCoc: integer('tien_coc').notNull().default(0),
  hinhThucTt: text('hinh_thuc_tt', { enum: ['tien_mat', 'chuyen_khoan', 'chua_tt'] }).notNull().default('chua_tt'),
  ghiChu: text('ghi_chu'),
  trangThai: text('trang_thai', { enum: ['moi', 'dang_lam', 'banh_xong', 'da_nhan', 'hoan_tat', 'huy'] }).notNull().default('moi'),
  ketThucKieu: text('ket_thuc_kieu', { enum: ['giao_khach', 'da_ship', 'len_tu'] }),
  lyDoHuy: text('ly_do_huy'),
  daSua: integer('da_sua').notNull().default(0),   // 1 = sửa sau khi bếp nhận, chờ bếp xác nhận đã thấy
  nhacNho: integer('nhac_nho').notNull().default(0), // 1 = đã bắn nhắc nhở mốc 2 tiếng
  nguoiTao: integer('nguoi_tao').notNull().references(() => users.id),
  nguoiLam: integer('nguoi_lam').references(() => users.id),
  nguoiGiao: integer('nguoi_giao').references(() => users.id),
  createdAt: integer('created_at').notNull(),
})

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').references(() => products.id), // null = bánh đặt riêng
  tenMon: text('ten_mon').notNull(),
  coBanh: text('co_banh'),          // size (T10, C12, T12, … C18, T18)
  cot: text('cot'),                 // vị cốt bánh
  kem: text('kem'),                 // vị kem (phủ) — có phụ thu như cốt
  mut: text('mut'),                 // vị mứt
  topping: text('topping'),         // JSON mảng topping (chọn nhiều)
  soLuong: integer('so_luong').notNull().default(1),
  chuViet: text('chu_viet'),
  ghiChu: text('ghi_chu'),
  giaBase: integer('gia_base'),     // giá base NV nhập (null = đơn cũ, chỉ có giá cuối)
  gia: integer('gia').notNull(),    // giá cuối = base + phụ thu (snapshot lúc lưu)
})

// Phụ kiện mua kèm trong đơn — lưu snapshot tên + giá (không tham chiếu id, giống cách lưu vị)
export const orderPhuKien = sqliteTable('order_phu_kien', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  ten: text('ten').notNull(),
  gia: integer('gia').notNull(),
  soLuong: integer('so_luong').notNull().default(1),
})

export const orderItemImages = sqliteTable('order_item_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderItemId: integer('order_item_id').notNull().references(() => orderItems.id),
  filePath: text('file_path').notNull(),
})

// Ảnh thành phẩm bếp chụp/tải lên khi bấm "Xong"
export const orderAnhThanhPham = sqliteTable('order_anh_thanh_pham', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  filePath: text('file_path').notNull(),
})

export const orderEvents = sqliteTable('order_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  userId: integer('user_id').references(() => users.id), // null = hệ thống (job nhắc nhở)
  hanhDong: text('hanh_dong').notNull(),
  chiTiet: text('chi_tiet'),
  thoiDiem: integer('thoi_diem').notNull(),
})
