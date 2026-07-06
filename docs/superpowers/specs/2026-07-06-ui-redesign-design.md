# Trạm Bánh - Hướng dẫn Thiết kế UI (UI Redesign Spec)

Tài liệu này xác định các nguyên tắc thiết kế và cấu trúc giao diện mới cho ứng dụng Trạm Bánh, hướng tới một trải nghiệm "hiện đại, đẹp mắt, chuyên nghiệp, mượt mà, xịn xò".

## 1. Visual Style (Phong cách Thiết kế)

**Cao cấp & Sang trọng (Premium Dark/Gold)**
- **Theme:** Ưu tiên Dark Mode mạnh mẽ (tông màu đen / xám đậm / nâu sẫm).
- **Màu nhấn (Accent Color):** Vàng kim (Gold / Đặt tên là `gold-400`, `gold-500` trong Tailwind).
- **Cảm giác mang lại:** Cao cấp, chuyên nghiệp, khơi gợi cảm giác "ngon miệng" của một tiệm bánh xịn.

## 2. Layout Structure (Cấu trúc Bố cục)

**Linh hoạt theo vai trò (Hybrid Layout)**
- **Quản lý:** Sử dụng **Left Sidebar** để dễ dàng chuyển đổi qua lại giữa nhiều danh mục (Sản phẩm, Đơn hàng, Nhân viên, Thống kê). Sidebar có thiết kế tối màu phân tách rõ với phần content.
- **Quầy / Bếp:** Sử dụng **Top Header Navigation** hoặc **Tabs ngang**. Do đặc thù công việc cần tập trung xử lý danh sách đơn hàng nên việc giải phóng không gian chiều ngang màn hình là cực kỳ quan trọng.

## 3. Component Design (Thiết kế Thành phần)

**Hiệu ứng Kính & Nổi bật (Glassmorphism & Glow)**
- **Thẻ (Cards):** Bỏ qua kiểu hộp đơn điệu. Các thẻ đơn hàng, sản phẩm sẽ sử dụng kỹ thuật Glassmorphism (nền bán trong suốt `backdrop-blur`) kết hợp với hiệu ứng ánh sáng mờ (glow) viền ngoài.
- **Góc bo (Border Radius):** Sử dụng các góc bo tròn lớn (`rounded-2xl` hoặc `rounded-xl`) để tạo độ mượt mà.
- **Phân tách tầng:** Giảm thiểu dùng đường viền (`border`) thô cứng, thay bằng khoảng trống (`gap`) và độ tương phản của nền.

## 4. Typography & Animations

- **Typography:** Sử dụng Font chữ hiện đại, tối giản như `Inter` hoặc `Outfit` (sẽ import qua Google Fonts nếu cần thiết). Tiêu đề in đậm mạnh mẽ, text phụ mảnh và nhạt màu.
- **Micro-interactions:** Mọi tương tác (hover, click) đều có hiệu ứng chuyển đổi mượt mà (`transition-all duration-300`). Nút bấm có hiệu ứng nhấn xuống, các thẻ có hiệu ứng nẩy nhẹ khi hover.

## 5. Hiện thực hoá trong Tailwind v4

Vì dự án dùng Tailwind v4 (`@import "tailwindcss"` trong `globals.css`):
- Toàn bộ Design Tokens (colors, radius, shadows) sẽ được định nghĩa trực tiếp vào block `@theme { ... }` ở `src/app/globals.css`.
- Không tạo các file CSS con bên ngoài trừ khi thực sự cần thiết, tuân thủ nguyên tắc Utility-first + Component architecture.

## 6. Lộ trình triển khai (Next Steps)

1. Thiết lập lại `src/app/globals.css`: Khai báo màu sắc, font chữ và các utilities cho Glassmorphism.
2. Cập nhật `AppShell.tsx`: Chia tách logic layout thành Sidebar (cho `quanly`) và Header (cho `quay`, `bep`).
3. Làm lại UI cho Đăng nhập (`login/page.tsx`).
4. Thiết kế lại các Components cốt lõi: `OrderCard.tsx`, `OrderDetail.tsx`, `OrderForm.tsx`, `StatBar.tsx`.
5. Đánh giá và căn chỉnh lại các trang con để đảm bảo tính đồng nhất.
