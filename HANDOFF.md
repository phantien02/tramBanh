# Bàn giao — nhánh `ui-claude-code`

> Ghi chú để tiếp tục làm ở máy khác (Claude Code desktop). Đọc file này là hiểu ngay bối cảnh.
> Cập nhật: phiên làm việc redesign UI + tính năng bánh theo mẫu.

## 1. Bối cảnh & mục tiêu nhánh này

Bản gốc trên `xay-dung-app` là UI do **antigravity** dựng (Dark/Gold glassmorphism, hợp tiệm bánh cao cấp). Nhánh `ui-claude-code` này **mọc từ `xay-dung-app`**, làm 3 việc lớn:

1. **Redesign toàn bộ UI** sang hướng **"Trạm bánh sáng đèn 24h"** — light theme, đúng chất tiệm **bánh tiện lợi 24h** (thương hiệu thật: FB `trambanh24h`), vừa sáng/ngọt vừa chuyên nghiệp.
2. **Đổi mô hình sản phẩm** → 1 sản phẩm **"Bánh kem sinh nhật theo mẫu"** cấu hình theo đơn (cốt/mứt/topping/size), + nâng cấp luồng lên đơn.
3. **Sinh 700 đơn test** + sửa loạt bug/hiệu năng phát hiện khi test.

`main` mới chỉ có tài liệu thiết kế (chưa có code app). Code đầy đủ nằm ở `xay-dung-app` (bản anti) và `ui-claude-code` (bản này).

## 2. Chạy ở máy mới

```bash
npm install
# tạo .env (xem .env.example) — cần SESSION_SECRET (chuỗi ngẫu nhiên ≥ 32 ký tự)
cp .env.example .env   # rồi sửa giá trị SESSION_SECRET

npm run dev            # http://localhost:3000  (tự chạy migration khi khởi động)
npm run db:seed        # tạo admin + sản phẩm mẫu + danh sách vị (idempotent)
npm run db:seed-orders # sinh ~700 đơn test (01/06→30/07, ảnh tải từ internet)
```

> **Lưu ý:** `data/` (DB SQLite + ảnh upload) và `.env` **bị gitignore** → không có trên GitHub.
> Ở máy mới, DB trống → phải chạy `db:seed` rồi `db:seed-orders` để có dữ liệu test.

### Tài khoản (sau khi seed)
| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| admin | admin123 | Quản lý (mọi màn) |
| quay1 | quay123 | Nhân viên quầy |
| bep1 | bep123 | Nhân viên bếp |

> `quay1/bep1` chỉ tồn tại nếu DB cũ có sẵn; DB seed mới chỉ tạo `admin`. Tạo thêm nhân viên trong **Quản lý → Nhân viên**.

## 3. Thiết kế UI — "Trạm bánh sáng đèn 24h"

- **Palette** (định nghĩa ở `src/app/globals.css` qua CSS var): Sữa ấm `#FCF6F1` (nền) · Vàng caramel `#D98A2B` (thương hiệu) · Đỏ dâu `#E24B6A` (CTA) · Xanh trà `#4FB286` (xong) · Nâu cà phê `#2B2119` (chữ/Bảng Trạm) · Xám bánh mì `#9C8A7D`.
- **Font** (`src/app/layout.tsx`, next/font): Fraunces (tiêu đề) · Be Vietnam Pro (nội dung, dấu tiếng Việt tốt) · Space Mono (số liệu → chất "bảng trạm").
- **Signature:** thanh **"Bảng Trạm"** trên đầu (nền nâu cà phê) — đồng hồ 24h chạy live, ca ngày/đêm, nav 3 tuyến màu (Quầy=dâu, Bếp=caramel, Quản lý=trà). Thẻ đơn kiểu **"vé tàu"** răng cưa.
- **Class dùng chung:** `.tb-card`, `.btn-primary`, `.tb-btn-ghost`, `.tb-input`, `.tb-chip` (+ `-tra/-dau/-caramel`), `.tb-board`, `.tb-col`, `.num` (số mono).

## 4. Mô hình dữ liệu mới (DB)

Migration `drizzle/0001_lazy_corsair.sql` (tự áp khi khởi động):
- `orders.tenNguoiNhan` (tên người nhận khi ship).
- `order_items.cot`, `.mut`, `.topping` (topping lưu JSON mảng — chọn nhiều). `coBanh` dùng cho **size**.
- Bảng mới `banh_options` (loai: `cot|mut|topping|size`, ten, thuTu, active) — **sửa được** ở màn **Quản lý → Sản phẩm**.
- Seed mặc định: 4 cốt, 7 mứt, 4 topping, 9 size (`T10, C12, T12, C14, T14, C16, T16, C18, T18` — C=cao ~10cm, T=thấp ~7cm, số=đường kính).

API mới: `src/app/api/banh-options/` (GET nhóm + sản phẩm mẫu, POST thêm, PATCH `[id]` sửa/ẩn-hiện).
Service: `src/lib/orders-service.ts` (lưu/đọc cột mới), validate SĐT VN `src/lib/phone.ts` (dùng ở API tạo/sửa đơn).

## 5. Luồng lên đơn (Quầy) — đã làm

- Mỗi bánh: **Cốt (1)** · **Mứt (1)** · **Topping (nhiều)** · **Size (1, bắt buộc)** + SL + giá + chữ viết + ghi chú + ảnh.
- **Đơn giá nhập theo nghìn đồng** (gõ `200` = 200.000đ). Áp cho cả phí ship / cọc / tổng ghi đè. Hiển thị cuối vẫn `200.000đ`. (Data lưu bằng đồng, input chia/nhân 1000.)
- **Ảnh mẫu: tối đa 5/bánh**, có nút xoá, đếm `x/5`.
- **Chọn giờ:** ngày qua lịch + **thanh trượt giờ 0–23** + phút bước 15'.
- **SĐT** validate chuẩn di động VN (client + server).
- **Ship:** thêm tên + SĐT người nhận (khác người đặt).
- Bỏ hình thức nhận **"tủ trưng bày"**.
- **Trang xác nhận** trước khi tạo đơn (tóm tắt đầy đủ) + ảnh mẫu to, **phóng to (lightbox) + tải về**.
- Bếp/thẻ đơn hiển thị rõ size/cốt/mứt/topping.

## 6. Bug đã sửa trong phiên test (quan trọng)

- **App lag khi có 700 đơn** — KHÔNG phải do 700 đơn (API 0,07–0,33s). **Gốc rễ:** trang Thống kê (`src/app/quanly/page.tsx`) bị **vòng lặp fetch vô hạn** (`mocXem` là dependency của `tai`, mà `tai` lại `setMocXem`) → gọi `/api/thong-ke` **1637 lần**, làm ngập server. Đã sửa: dùng `useRef` cho mốc đang xem, effect chỉ chạy khi đổi preset. → hết lag + hết nhấp nháy số + hết `unhandledRejection`.
- **Chi tiết đơn bị "lem"/cắt** — overlay modal `z-20` nằm dưới header `z-40`. Đã nâng overlay lên `z-50` (bep, quanly/don) và lightbox `z-[60]`.
- **Nút bấm khó nhận biết** — thêm con trỏ ngón tay + hover "nhích lên" cho `.btn-primary`/`.tb-btn-ghost` (globals.css); nút ghost có nền/viền rõ.
- Thêm nút nhanh **Hôm nay / 7 ngày / 30 ngày** ở màn **Tất cả đơn**.

## 7. Vấn đề còn tồn đọng / cần bàn (TODO)

- [ ] **Ma trận khả năng theo size** (theo ảnh brochure): Bento T10 không chọn vị cốt/không tạo hình 3D, C/T16-18 đầy đủ… — **hiện CHƯA áp** (mọi size đều hỏi đủ 4 mục, theo yêu cầu "làm đơn giản trước"). Cần bàn nếu muốn đúng brochure 100%.
- [ ] **"Món bán chạy"** ở Thống kê giờ chỉ 1 dòng (vì chỉ còn 1 sản phẩm). Có thể đổi thành thống kê theo **size** hoặc **cốt** cho hữu ích hơn.
- [ ] Ảnh mẫu 700 đơn tải từ `loremflickr` (keyword cake) — chỉ là ảnh test, không phải ảnh thật của tiệm.
- [ ] Chưa có phân trang cho "Tất cả đơn" (chưa cần — dữ liệu nhỏ, đã lọc theo khoảng ngày).
- [ ] Preview screenshot qua MCP bị lỗi trong môi trường máy làm việc → xác minh UI bằng cách mở localhost trực tiếp.

## 8. Kiểm chứng đã chạy
- `npx tsc --noEmit` sạch (0 lỗi). `npm run build` thành công (22 route).
- Smoke-test API: tạo/đọc đơn có đủ cốt/mứt/topping/size/người nhận OK; validate SĐT trả 400 khi sai; đăng nhập 3 vai trò OK.

## 9. Bước tiếp theo gợi ý
1. Xem kỹ UI từng màn với 700 đơn, chốt các mục TODO ở mục 7.
2. Nếu ưng → cân nhắc merge `ui-claude-code` vào `main` (hoặc mở PR).
3. Cân nhắc thay ảnh mẫu test bằng ảnh thật của tiệm.
