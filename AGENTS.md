# Trạm Bánh — Hướng dẫn cho agent

Ứng dụng quản lý đơn hàng cho tiệm bánh (giao diện tiếng Việt). Ba vai trò:
**quầy** tạo/tiếp nhận đơn, **bếp** theo dõi & xử lý đơn theo ngày, **quản lý**
quản trị sản phẩm/nhân viên/thống kê. Dữ liệu (SQLite + ảnh) lưu cục bộ trong
`data/`.

> File này là nguồn hướng dẫn chung cho mọi công cụ AI (Antigravity, Claude Code,
> Cursor, Copilot…). `CLAUDE.md` chỉ import file này. Sửa hướng dẫn ở đây, đừng
> viết trùng nơi khác.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tech stack

- **Next.js 16.2** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** — cấu hình kiểu CSS-first, **KHÔNG có `tailwind.config.js`**.
  Entry là `src/app/globals.css` (`@import "tailwindcss";`); tùy biến theme bằng
  `@theme { ... }` ngay trong CSS. PostCSS dùng `@tailwindcss/postcss`.
- **Drizzle ORM** + **better-sqlite3** (SQLite, chế độ WAL)
- **jose** (JWT session cookie), **bcryptjs** (băm mật khẩu), **sharp** (xử lý ảnh)
- Realtime bằng **SSE** (`src/lib/sse.ts` + `src/components/useRealtime.ts`)

## Chạy để phát triển (dev / preview UI)

```bash
npm i                 # cài dependencies (lần đầu)
npm run db:seed       # tạo data/tram-banh.db nếu chưa có: admin/admin123 + bánh mẫu
npm run dev           # chạy dev server
```

Mở **http://localhost:3000**, đăng nhập `admin` / `admin123` (vai trò quản lý).
Còn hai tài khoản mẫu vai trò khác để test giao diện: `quay1` (quầy), `bep1` (bếp).

**Bẫy cổng 3000:** bản deploy Docker (xem README) cũng chiếm cổng 3000. Nếu
container đang chạy, `npm run dev` sẽ không bind được. Dừng container trước
(`docker compose stop`) hoặc chạy dev ở cổng khác: `npm run dev -- -p 3001`.

**DB dev ≠ DB Docker:** dev đọc/ghi trực tiếp `./data/tram-banh.db`; container
Windows dùng named volume riêng. Sửa dữ liệu bên này không ảnh hưởng bên kia.

## Các lệnh khác

```bash
npm run build         # build production (next build → standalone)
npm test              # chạy test (vitest)
npm run lint          # eslint
npm run db:generate   # sinh migration từ schema (drizzle-kit)
npm run db:seed       # seed dữ liệu mẫu (bỏ qua nếu đã có dữ liệu)
```

`npm run start` chỉ để chạy bản build cục bộ — **không dùng khi triển khai**
(triển khai bằng Docker, xem `README.md`).

## Bản đồ mã nguồn (ưu tiên cho việc làm UI)

- `src/app/**` — các trang theo vai trò (App Router):
  - `login/` — đăng nhập
  - `quay/` — màn hình quầy: danh sách đơn, `don-moi/` tạo đơn, `don/[id]/`
    chi tiết, `don/[id]/sua/` sửa đơn
  - `bep/` — màn hình bếp: theo dõi & xử lý đơn trong ngày
  - `quanly/` — quản trị: `banh/` sản phẩm, `don/` đơn, `nhan-vien/` nhân viên,
    trang gốc là thống kê
  - `page.tsx` (gốc) — điều hướng về `/login` nếu chưa đăng nhập
  - `layout.tsx`, `globals.css` — layout gốc & style toàn cục
- `src/components/**` — component dùng chung: `AppShell` (khung + điều hướng),
  `OrderCard`, `OrderDetail`, `OrderForm`, `StatBar`, `useRealtime` (hook SSE)
- `src/app/api/**` — backend (route handlers): `login`, `logout`, `me`, `orders`,
  `products`, `users`, `customers`, `upload`, `thong-ke`, `events` (SSE)…
- `src/lib/**` — logic nghiệp vụ (đơn hàng, trạng thái, tiền, thống kê, session,
  auth, nhắc nhở). Giữ logic ở đây, đừng nhồi vào component.
- `src/db/**` — `schema.ts` (bảng), `index.ts` (kết nối + tự chạy migrate khi
  khởi động), `seed.ts` (dữ liệu mẫu)
- `src/proxy.ts` — middleware kiểm tra đăng nhập/vai trò

## Quy ước

- **Ngôn ngữ:** toàn bộ chữ hiển thị cho người dùng là **tiếng Việt**. Tên biến/
  hàm trong code cũng phần lớn dùng tiếng Việt không dấu (`taoDb`, `vaiTro`,
  `quetNhacNho`…) — theo phong cách sẵn có.
- **Style:** dùng utility class của Tailwind ngay trong JSX. Cần token/màu/spacing
  dùng lại thì khai báo trong `@theme` ở `globals.css`, không tạo file config.
- **Múi giờ:** mọi script đặt `TZ=Asia/Ho_Chi_Minh` (logic ngày/đơn theo ngày phụ
  thuộc múi giờ). Đừng bỏ biến này khi thêm script.
- **Dữ liệu:** `data/` chứa DB + ảnh upload, **không commit** (đã có trong
  `.gitignore`).

## Kiểm thử

Test viết bằng vitest, đặt cạnh file nguồn (`*.test.ts`) trong `src/lib` và
`src/db`. Chạy `npm test` trước khi coi như xong một thay đổi có ảnh hưởng logic.

## Triển khai

Bằng Docker Compose — chi tiết đầy đủ trong `README.md` (mục "Triển khai bằng
Docker").

- **Linux (máy chủ thật):** `docker compose up -d --build` — dữ liệu ở bind
  mount `./data`.
- **Windows (Docker Desktop):** phải thêm file override tường minh:
  `docker compose -f docker-compose.yml -f docker-compose.windows.yml up -d --build`
  (bind mount không hỗ trợ shared-memory của SQLite WAL → dùng named volume).

Đừng đổi tên `docker-compose.windows.yml` thành `docker-compose.override.yml`:
tên đó Compose tự nạp trên **mọi** hệ điều hành, máy chủ Linux `git pull` về sẽ
đổi sang named volume và chạy với DB rỗng.
