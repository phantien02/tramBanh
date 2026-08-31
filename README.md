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

Toàn bộ dữ liệu nằm trong `data/` (cơ sở dữ liệu + ảnh upload).

**Đừng bao giờ copy thẳng `data/tram-banh.db` khi app đang chạy.** SQLite dùng chế
độ WAL: dữ liệu mới nằm tạm ở `tram-banh.db-wal` rồi mới gộp vào file chính. Copy
thiếu `-wal` là mất phần lớn dữ liệu gần nhất — **và lúc copy không báo lỗi gì**,
tới khi cần khôi phục mới biết. Đợt chuyển VPS 29/08/2026 đã gặp đúng cảnh này:
`.db` chỉ 224KB trong khi `-wal` giữ 4.1MB chưa gộp.

#### Chạy backup

```bash
npm run backup
```

Lệnh này làm đủ 4 việc và **an toàn kể cả khi app đang ghi**:

1. `VACUUM INTO` → bản chụp DB nhất quán (SQLite tự gộp WAL)
2. Đối chiếu **số dòng từng bảng** của bản sao với bản gốc + `integrity_check`;
   lệch hoặc hỏng thì **báo lỗi và không tạo gói**, thay vì im lặng cho ra file rác
3. Đóng gói kèm `uploads/` thành `backups/tram-banh-backup-YYYY-MM-DD.tar.gz`
4. Xoay vòng, giữ 30 bản gần nhất

Chỉnh bằng biến môi trường: `DATA_DIR`, `BACKUP_DIR`, `GIU_LAI`.

> Gói backup **không chứa file `.env`**. `SESSION_SECRET` trong đó phải cất riêng
> (trình quản lý mật khẩu) — mất nó thì mọi người bị đăng xuất, nhưng đẩy nó lên
> cùng chỗ với dữ liệu là mở rộng thiệt hại khi kho backup bị lộ.

#### Tự động hằng đêm, đẩy lên Google Drive

`scripts/backup-vps.sh` là điểm vào cho cron: chạy `npm run backup` rồi đẩy lên
Drive bằng `rclone` và dọn bản cũ hơn 30 ngày ở cả hai đầu.

Cài một lần trên VPS:

```bash
# 0) Máy chủ cần có Node (kiểm tra trước)
node -v || { curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs; }

# 1) Cài rclone và nối với Google Drive (có bước đăng nhập Google trên trình duyệt)
apt install -y rclone
rclone config          # tạo remote tên `gdrive`, loại "drive"

# 2) Chạy thử một phát, rồi vào Drive kiểm tra file đã lên chưa
/opt/apps/tram-banh/scripts/backup-vps.sh

# 3) Đặt lịch 2h sáng hằng ngày
crontab -e
# 0 2 * * * /opt/apps/tram-banh/scripts/backup-vps.sh >> /var/log/tram-banh-backup.log 2>&1
```

Script **cố tình thoát với lỗi** nếu chưa có `rclone`: gói backup nằm cùng ổ đĩa
với bản gốc thì không phải backup, và im lặng trong trường hợp đó là nguy hiểm.

#### Khôi phục

```bash
docker compose down
tar -xzf tram-banh-backup-YYYY-MM-DD.tar.gz -C /tmp/phuc-hoi
rm -f data/tram-banh.db data/tram-banh.db-wal data/tram-banh.db-shm
cp /tmp/phuc-hoi/tram-banh.db data/
rm -rf data/uploads && cp -r /tmp/phuc-hoi/uploads data/
docker compose up -d
```

Nhớ xóa cả `-wal`/`-shm` cũ, nếu không SQLite sẽ gộp phần thừa của DB cũ vào bản
vừa khôi phục.

> **Backup chưa thử khôi phục thì chưa tính là backup.** Thỉnh thoảng giải nén một
> gói ra thư mục tạm và mở thử, đừng đợi tới lúc sự cố mới biết nó hỏng.

### HTTPS

Container chỉ phục vụ HTTP ở cổng 3000. Nếu cần HTTPS, đặt ứng dụng sau một
reverse proxy như nginx hoặc Caddy và trỏ tên miền/cổng 443 về `localhost:3000`
trên máy chủ, hoặc dùng Cloudflare Tunnel (có sẵn HTTPS, đồng thời không phải mở
cổng ra internet).

HTTPS cũng là **điều kiện bắt buộc** để thông báo đẩy chạy được (xem mục dưới):
service worker không đăng ký được trên HTTP thường, đây là quy định cứng của
trình duyệt, không lách được.

### Thông báo đẩy cho nhân viên (Web Push)

Báo cho bếp có đơn mới và cho quầy có bánh xong, **kể cả khi tablet đã ngủ hoặc
đóng app** — khác với tiếng chuông sẵn có, vốn chỉ kêu khi trang đang mở. Push
**bổ sung** cho chuông chứ không thay thế.

Ai nhận cái gì:

| Sự kiện | Bếp | Quầy | Quản lý |
|---|:--:|:--:|:--:|
| Đơn mới | ✅ | | ✅ |
| Bánh xong | | ✅ | ✅ |
| Sắp tới giờ giao (còn 2 tiếng) | ✅ | | ✅ |
| Đơn vừa được sửa | ✅ | | ✅ |
| Chuyển sang trạng thái khác | | | |

Dòng cuối để trống là cố ý: thông báo không dẫn tới hành động sẽ dạy người ta bỏ
qua thông báo, rồi bỏ qua luôn cái thật sự gấp.

#### Bật trên máy chủ

```bash
# 1) Sinh cặp khóa VAPID (khóa của app, không phải tài khoản cá nhân)
npx web-push generate-vapid-keys

# 2) Thêm vào .env trên máy chủ rồi dựng lại container
#    VAPID_PUBLIC_KEY=...
#    VAPID_PRIVATE_KEY=...
#    VAPID_SUBJECT=mailto:ban@vidu.com
docker compose up -d --build
```

**Bỏ trống 2 khóa thì tính năng tự tắt êm** — app chạy y như chưa có nó, nút "Bật
thông báo" tự ẩn. Deploy lên máy chủ chưa cấu hình không vỡ gì.

#### Nhân viên bật trên máy mình

Bấm nút **🔔 Bật thông báo** trên thanh trên cùng, rồi cho phép. Mỗi máy phải bật
riêng; đổi điện thoại hoặc xóa dữ liệu trình duyệt thì bật lại.

**Riêng iPhone/iPad:** phải mở bằng **Safari** → **Chia sẻ** → **Thêm vào MH
chính**, rồi mở app vừa thêm mới bật được. Hạn chế của Apple (iOS 16.4+), không
bỏ qua được. App tự phát hiện và hiện hướng dẫn từng bước thay vì một cái nút bấm
vào chẳng có gì xảy ra.

> **Về quyền riêng tư:** thông báo hiện mã đơn, **tên khách** và giờ giao trên màn
> hình khóa. Nội dung được mã hóa đầu-cuối nên Google/Apple không đọc được, nhưng
> ai cầm điện thoại nhân viên lên thì đọc được. Muốn kín hơn thì sửa
> `src/lib/push-routing.ts` — toàn bộ phần soạn chữ nằm gọn trong một hàm.

## Cấu trúc dữ liệu

- `data/tram-banh.db` — cơ sở dữ liệu SQLite (đơn hàng, sản phẩm, nhân viên...).
- `data/uploads/` — ảnh sản phẩm đã upload.

Không commit thư mục `data/` vào git (đã có trong `.gitignore`).
