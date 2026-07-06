# Thiết kế ứng dụng điều hành tiệm bánh kem — "Trạm Bánh"

Ngày: 2026-07-06
Trạng thái: Chờ duyệt

## 1. Mục tiêu

Ứng dụng web điều hành tiệm bánh kem (1 tiệm), giải quyết vấn đề cốt lõi: **không bao giờ quên đơn**, trong bối cảnh đơn đến từ nhiều kênh (Zalo, Messenger, điện thoại, tại quầy), đặt trước nhiều ngày, giờ nhận rải rác.

Luồng nghiệp vụ chính:

```
NV quầy nhận đơn từ khách → Bếp nhận thông tin và làm bánh → Bếp đánh dấu xong
→ NV quầy nhận lại bánh → Giao khách / ship / để tủ trưng bày
Quản lý: xem toàn bộ + thống kê chỉ số bán hàng
```

Tiêu chí thiết kế: dễ dùng, trực quan, thao tác nhanh (tạo đơn đơn giản dưới 30 giây), chạy tốt trên tablet cảm ứng lẫn máy tính.

## 2. Phạm vi

**Có trong giai đoạn 1:**
- Quản lý đơn hàng theo luồng trạng thái, thời gian thực giữa các màn hình
- Nhập đơn tay, gắn nhãn nguồn đơn (chưa tự kết nối Zalo/Messenger)
- Danh mục bánh mẫu + tùy chỉnh từng món
- Tài khoản từng nhân viên, 3 vai trò: Quầy / Bếp / Quản lý
- Thống kê bán hàng cho quản lý
- Cơ chế chống quên đơn nhiều lớp (mục 5)

**Không có trong giai đoạn 1 (để sau):**
- Tự động đọc tin nhắn Zalo OA / Facebook Fanpage
- Quản lý nguyên liệu, tồn kho
- Nhiều chi nhánh
- In hóa đơn, kết nối máy in nhiệt

## 3. Vai trò và phân quyền

| Vai trò | Quyền |
|---------|-------|
| **Quầy** | Tạo/sửa/hủy đơn, xác nhận nhận bánh từ bếp, hoàn tất đơn (giao khách/ship/lên tủ), xem mọi đơn |
| **Bếp** | Xem hàng đợi bếp (hôm nay + các ngày tới), nhận làm, đánh dấu xong. Không sửa nội dung đơn |
| **Quản lý** | Toàn quyền: mọi thao tác của Quầy + Bếp, quản lý danh mục bánh, tài khoản nhân viên, xem thống kê, xem nhật ký |

Mỗi nhân viên một tài khoản (username + mật khẩu). Mọi thao tác chuyển trạng thái đều ghi lại ai bấm, lúc nào.

## 4. Luồng trạng thái đơn

```
MỚI TẠO ──► BẾP ĐANG LÀM ──► BÁNH XONG ──► QUẦY ĐÃ NHẬN ──► HOÀN TẤT
(quầy tạo)   (bếp bấm         (bếp bấm      (quầy bấm        (quầy bấm: giao khách
              "Nhận làm")      "Xong")       "Đã nhận bánh")   / ship / lên tủ)

Bất kỳ trạng thái nào trước HOÀN TẤT ──► HỦY (bắt buộc nhập lý do)
```

Nguyên tắc sắt:
- **Chỉ chuyển trạng thái khi có người bấm tay.** Không có chuyển tự động, không có "xong ngầm".
- Đơn chưa HOÀN TẤT luôn hiển thị trên màn hình của vai trò đang chịu trách nhiệm bước đó.
- HOÀN TẤT ghi kèm hình thức kết thúc: `Giao khách tại tiệm` / `Đã ship` / `Lên tủ trưng bày`.
- Đơn "lấy ngay" tại quầy (khách mua bánh có sẵn ở tủ) được phép tạo và hoàn tất ngay trong một bước — không bắt đi qua bếp.

## 5. Cơ chế chống quên đơn (nhiều lớp)

1. **Hàng đợi bếp theo ngày.** Mỗi ngày, mọi đơn có ngày giao là hôm nay tự hiện lên hàng đợi bếp, **xếp theo giờ khách lấy từ sớm đến muộn**. Thứ tự chỉ là gợi ý — bếp toàn quyền chọn đơn làm trước/sau tùy độ khó.
2. **Bếp xem được các ngày tới.** Chuyển ngày (mai, ngày kia...) để xem đơn sắp tới và có thể **nhận làm trước** (ví dụ đề phòng mai nghỉ). Đơn làm trước vẫn đi qua luồng trạng thái bình thường.
3. **Nhắc nhở mốc 2 tiếng.** Đơn đến trước giờ khách lấy 2 tiếng mà vẫn chưa ở trạng thái BÁNH XONG (hoặc muộn hơn) → chuông + thẻ đơn chuyển đỏ, ghim lên đầu hàng đợi bếp.
4. **Màu cảnh báo theo hạn** trên mọi màn hình: bình thường → vàng (còn ≤ 2 tiếng) → đỏ (trễ giờ lấy mà chưa hoàn tất).
5. **Chuông + badge:** bếp nghe chuông khi có đơn mới cho hôm nay; quầy nghe chuông khi bếp bấm "Xong" (để đi nhận bánh).
6. **Đơn không bao giờ tự biến mất.** Chưa bấm HOÀN TẤT thì đơn còn nằm trên màn hình, kể cả sang ngày hôm sau (đơn quá hạn hôm qua vẫn hiện đỏ trên đầu danh sách hôm nay).
7. **Nhật ký đầy đủ:** ai tạo, ai nhận làm, ai đánh dấu xong, ai giao — kèm thời điểm. Quản lý truy được mọi đơn.

## 6. Trường thông tin đơn (bản đầu — sẽ cập nhật theo thực tế)

**Thông tin chung:**
- Mã đơn tự sinh, ngắn, dễ đọc qua điện thoại: `#0607-03` (ngàytháng + số thứ tự trong ngày)
- Nguồn đơn: `Tại quầy` / `Zalo` / `Messenger` / `Điện thoại` / `Khác`
- Khách hàng: tên + số điện thoại. Gõ SĐT đã có → tự điền tên (nhận diện khách quen, xem lịch sử mua)
- Ghi chú chung của đơn

**Danh sách món** (một đơn có thể nhiều món), mỗi món gồm:
- Bánh chọn từ danh mục (tên, giá gốc, ảnh) hoặc chọn `Bánh đặt riêng` (tự nhập tên + giá)
- Cỡ bánh (ví dụ 16/20/24 cm — cấu hình theo từng loại bánh trong danh mục)
- Số lượng
- **Chữ viết lên bánh** (ô riêng — hiển thị TO trên màn hình bếp)
- Ghi chú món (ít ngọt, đổi màu hoa, cắm nến số...)
- **Ảnh mẫu** khách gửi (tải lên/dán trực tiếp từ Zalo/Messenger, nhiều ảnh)
- Giá món (tự điền từ danh mục, sửa được)

**Thời gian & giao nhận:**
- **Ngày + giờ khách nhận** (bắt buộc; đơn lấy ngay thì bấm nút "Lấy ngay" tự điền giờ hiện tại)
- Hình thức nhận: `Nhận tại tiệm` / `Ship` (kèm địa chỉ, SĐT người nhận nếu khác, phí ship) / `Tủ trưng bày`

**Tiền:**
- Tổng tiền (tự cộng từ các món + phí ship, sửa được — ví dụ giảm giá)
- Tiền cọc đã đưa
- Còn lại phải thu (tự tính)
- Hình thức thanh toán: `Tiền mặt` / `Chuyển khoản` / `Chưa thanh toán`

**Hệ thống tự ghi:** trạng thái, người tạo, người làm, người giao, các mốc thời gian chuyển trạng thái, lý do hủy (nếu hủy).

## 7. Danh mục bánh (quản lý cấu hình)

- Tên bánh, giá theo từng cỡ, ảnh minh họa, còn bán / ngừng bán
- Nhóm bánh (bánh kem sinh nhật, bánh su, bông lan trứng muối...) để lọc nhanh khi tạo đơn và thống kê

## 8. Giao diện theo vai trò

### 8.1 Màn hình Quầy
- Nút **"＋ Đơn mới"** nổi bật nhất màn hình. Form tạo đơn tối ưu tốc độ: chọn bánh từ lưới ảnh, các trường hay dùng lên đầu, mặc định thông minh (nguồn = Tại quầy, giờ nhận = hôm nay).
- Bảng đơn dạng **cột theo trạng thái** (Mới → Bếp đang làm → Bánh xong → Đã nhận → chờ giao), mặc định tab **"Hôm nay"**, xếp theo giờ nhận.
- Tab **"Sắp tới"**: đơn các ngày sau, nhóm theo ngày.
- Cột "Bánh xong" nhấp nháy + chuông khi bếp báo xong.
- Tìm kiếm nhanh theo mã đơn / tên / SĐT khách.

### 8.2 Màn hình Bếp
- Tối giản kiểu bảng bếp nhà hàng, tối ưu tablet treo tường/cảm ứng: **thẻ đơn TO, chữ viết lên bánh và ảnh mẫu hiện rõ**, chạm vào thẻ xem chi tiết phóng to.
- Mặc định hàng đợi **hôm nay**, xếp theo giờ lấy sớm → muộn. Nút chuyển ngày ◀ ▶ để xem mai/ngày kia và nhận làm trước.
- Mỗi thẻ chỉ 1 nút hành động: `Nhận làm` → `Xong`. Không thao tác thừa.
- Đơn nhắc nhở (mốc 2 tiếng) đỏ, ghim đầu, kèm chuông.

### 8.3 Màn hình Quản lý
- Dashboard thống kê: doanh thu ngày/tuần/tháng (biểu đồ), số đơn theo nguồn, món bán chạy, tỉ lệ đơn trễ hạn, giờ cao điểm, khách quen mua nhiều.
- Danh sách toàn bộ đơn với bộ lọc (khoảng ngày, trạng thái, nguồn, nhân viên) + xuất Excel.
- Quản lý danh mục bánh, tài khoản nhân viên.
- Xem nhật ký thao tác của từng đơn.

## 9. Kiến trúc kỹ thuật

- **Next.js (App Router) + TypeScript** — một ứng dụng duy nhất chứa giao diện + API.
- **SQLite** qua Drizzle ORM — database là 1 file, backup = copy file. Đủ sức cho 1 tiệm (vài trăm đơn/ngày vẫn thoải mái).
- **Thời gian thực bằng SSE (Server-Sent Events):** màn hình quầy/bếp tự cập nhật khi bên kia bấm, không cần F5. Nếu mất kết nối, client tự kết nối lại và tải lại danh sách (không mất dữ liệu vì server là nguồn sự thật duy nhất).
- **Nhắc nhở mốc 2 tiếng:** job kiểm tra định kỳ mỗi phút trên server, phát sự kiện qua SSE.
- **Âm thanh:** phát trên trình duyệt khi nhận sự kiện (tablet bếp cần bật màn hình, đã chạm vào trang ít nhất 1 lần theo yêu cầu của trình duyệt).
- **Ảnh mẫu:** lưu file trên server (`/data/uploads`), nén lại khi tải lên.
- **Đăng nhập:** username + mật khẩu, session cookie. Quản lý tạo/khóa tài khoản.
- **Giao diện:** Tailwind CSS, tiếng Việt, responsive (tablet dọc/ngang, máy tính, điện thoại cho quản lý).
- **Triển khai:** Docker Compose trên VPS GCP sẵn có; dữ liệu (SQLite + ảnh) mount ra volume để backup dễ.
- **Múi giờ:** toàn hệ thống dùng Asia/Ho_Chi_Minh.

### Mô hình dữ liệu (rút gọn)

```
users(id, username, password_hash, ho_ten, vai_tro[quay|bep|quanly], active)
customers(id, sdt, ten, ghi_chu)
products(id, ten, nhom, anh, active)
product_sizes(id, product_id, ten_co, gia)
orders(id, ma_don, customer_id, nguon, ngay_gio_nhan, hinh_thuc_nhan,
       dia_chi_ship, phi_ship, tong_tien, tien_coc, hinh_thuc_tt,
       ghi_chu, trang_thai, ket_thuc_kieu, ly_do_huy,
       nguoi_tao, nguoi_lam, nguoi_giao, created_at, ...)
order_items(id, order_id, product_id?, ten_mon, co_banh, so_luong,
            chu_viet, ghi_chu, gia)
order_item_images(id, order_item_id, file_path)
order_events(id, order_id, user_id, hanh_dong, thoi_diem)  -- nhật ký
```

## 10. Xử lý lỗi & tình huống biên

- Hai người bấm cùng lúc trên một đơn: server kiểm tra trạng thái hiện tại trước khi chuyển; người bấm sau nhận thông báo "đơn đã được X xử lý".
- Mất internet ở tiệm: màn hình hiện rõ "MẤT KẾT NỐI" trên nền đỏ để nhân viên biết dữ liệu không còn cập nhật (tránh tin nhầm màn hình cũ).
- Sửa đơn sau khi bếp đã nhận làm: cho phép (khách hay đổi ý), nhưng bếp nhận chuông + thẻ đơn đánh dấu "ĐÃ SỬA" cho đến khi bếp chạm xác nhận đã thấy.
- Đơn quá hạn từ hôm trước chưa hoàn tất: vẫn hiện đỏ đầu danh sách hôm nay, không bị trôi mất.

## 11. Kiểm thử

- Unit test cho logic trạng thái (chuyển hợp lệ/không hợp lệ), tính tiền, sinh mã đơn, mốc nhắc nhở 2 tiếng.
- Test API cho các thao tác chính (tạo đơn, chuyển trạng thái, phân quyền).
- Kiểm tra tay theo kịch bản nghiệp vụ: 1 đơn đi hết vòng đời; đơn đặt trước 1 tuần; đơn sửa giữa chừng; đơn hủy; 2 người bấm đồng thời.

## 12. Lộ trình sau giai đoạn 1 (ghi nhận, chưa làm)

- Kết nối Zalo OA / Messenger tự tạo đơn nháp
- In tem/hóa đơn máy in nhiệt
- Quản lý nguyên liệu, chi phí, lợi nhuận
- Thông báo đẩy về điện thoại quản lý (Zalo/Telegram)
