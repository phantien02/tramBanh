# Trạm Bánh

Ứng dụng quản lý đơn hàng cho tiệm bánh: quầy tiếp nhận/tạo đơn, bếp theo dõi và
xử lý đơn theo ngày, quản lý theo dõi sản phẩm/nhân viên/thống kê. Dữ liệu (cơ
sở dữ liệu SQLite + ảnh sản phẩm) được lưu cục bộ trong thư mục `data/` để dễ
sao lưu và triển khai trên một máy chủ nhỏ.

## Yêu cầu

- Chạy dev: Node.js 22+ và npm.
- Triển khai: Docker + Docker Compose (khuyến nghị — không cần cài Node trên máy chủ).

## Chạy ở môi trường dev

```bash
npm i
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`. Lần đầu seed sẽ tạo tài khoản quản lý
`admin` / `admin123` và vài bánh mẫu — **đổi mật khẩu ngay** sau khi đăng nhập lần đầu.

Các lệnh khác:

```bash
npm run build   # build production
npm run start   # chạy bản build (không dùng khi triển khai bằng Docker)
npm test        # chạy test
npm run lint    # kiểm tra lint
```

## Triển khai bằng Docker

1. Tạo file `.env` chứa khóa bí mật ký phiên đăng nhập (mỗi lần triển khai mới nên tạo khóa riêng):

   ```bash
   echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env
   ```

2. Seed dữ liệu lần đầu — cần cài npm dependencies trước:

   ```bash
   npm i
   DATA_DIR=./data npm run db:seed
   ```

   Lệnh này tạo file `data/tram-banh.db` với tài khoản quản lý mẫu. Nếu máy chủ
   không có Node.js, seed ở máy dev rồi copy thư mục `data/` lên máy chủ (đặt
   cạnh `docker-compose.yml`).

   _Lưu ý: tsx và cross-env là devDependencies nên cần `npm i` trước khi seed._

3. Build và chạy:

   ```bash
   docker compose up -d --build
   ```

   Ứng dụng chạy ở cổng `3000` (`http://<ip-may-chu>:3000`). Toàn bộ dữ liệu
   (file SQLite `tram-banh.db` và ảnh upload) được lưu trong thư mục `data/`
   trên máy chủ, gắn vào container qua volume `./data:/app/data` — dữ liệu vẫn
   còn nguyên khi restart hoặc rebuild container.

   Đăng nhập lần đầu bằng `admin` / `admin123` — **đổi mật khẩu ngay** trong
   mục quản lý nhân viên.

   > **Chạy thử trên Windows (Docker Desktop)** thì phải thêm file override:
   > `docker compose -f docker-compose.yml -f docker-compose.windows.yml up -d --build`
   > — bind mount `./data` trên Windows không hỗ trợ shared-memory của SQLite
   > WAL. Trên máy chủ Linux **không** dùng file này.

4. Xem log / dừng / khởi động lại:

   ```bash
   docker compose logs -f
   docker compose restart
   docker compose down
   ```

### Nâng cấp lên phiên bản mới

Migration cơ sở dữ liệu **tự chạy** khi container khởi động, nhưng vẫn sao lưu
trước cho chắc:

```bash
cp -r data data-backup-$(date +%Y%m%d-%H%M)
git pull
docker compose up -d --build
docker compose logs -f --tail=50
```

Nếu bản mới có lỗi, quay lại commit cũ (`git checkout <commit-cũ>` rồi build
lại) và khôi phục thư mục `data/` từ bản sao lưu.

### Sao lưu (backup)

Toàn bộ dữ liệu nằm trong thư mục `data/` (cơ sở dữ liệu + ảnh). Sao lưu định kỳ
bằng cách copy thư mục này sang nơi lưu trữ khác, ví dụ:

**Đừng copy thẳng `data/` khi app đang chạy.** SQLite dùng chế độ WAL: dữ liệu
mới nằm tạm ở `tram-banh.db-wal` rồi mới gộp vào file chính, nên `cp` giữa chừng
có thể ra bản sao thiếu hoặc hỏng — mà lúc copy **không báo lỗi gì**, tới khi cần
khôi phục mới biết. Dùng `VACUUM INTO` để lấy bản chụp nhất quán:

```bash
# 1) Chụp DB (an toàn kể cả khi app đang ghi)
docker compose exec -T tram-banh node -e \
  'new (require("better-sqlite3"))("/app/data/tram-banh.db",{readonly:true}).exec("VACUUM INTO '"'"'/tmp/snap.db'"'"'")'
docker compose cp tram-banh:/tmp/snap.db ./backup-$(date +%Y%m%d).db
docker compose exec -T tram-banh rm -f /tmp/snap.db

# 2) Ảnh upload (file tĩnh, copy thẳng được)
tar czf ./backup-uploads-$(date +%Y%m%d).tar.gz -C data uploads
```

Nếu dừng hẳn container (`docker compose down`) thì copy cả thư mục `data/` cũng
an toàn, vì không còn tiến trình nào ghi vào.

Khôi phục: dừng container (`docker compose down`), thay `data/tram-banh.db` bằng
file backup (xóa kèm `-wal`/`-shm` cũ nếu có) và giải nén lại `uploads/`, rồi
`docker compose up -d`.

> ⚠️ Hiện **chưa có backup tự động** trên máy chủ, và các bản copy tay đều nằm
> cùng ổ đĩa với dữ liệu gốc. Xem [docs/van-de-ton-dong.md](docs/van-de-ton-dong.md)
> để biết hiện trạng và hướng xử lý.

### HTTPS

Container chỉ phục vụ HTTP ở cổng 3000. Nếu cần HTTPS, đặt ứng dụng sau một
reverse proxy như nginx hoặc Caddy và trỏ tên miền/cổng 443 về `localhost:3000`
trên máy chủ, hoặc dùng Cloudflare Tunnel (có sẵn HTTPS, đồng thời không phải mở
cổng ra internet).

HTTPS cũng là **điều kiện bắt buộc** nếu sau này muốn làm thông báo đẩy cho nhân
viên (Web Push không chạy trên HTTP) — xem
[docs/van-de-ton-dong.md](docs/van-de-ton-dong.md).

## Cấu trúc dữ liệu

- `data/tram-banh.db` — cơ sở dữ liệu SQLite (đơn hàng, sản phẩm, nhân viên...).
- `data/uploads/` — ảnh sản phẩm đã upload.

Không commit thư mục `data/` vào git (đã có trong `.gitignore`).
