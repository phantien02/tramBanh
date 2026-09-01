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
thiếu `-wal` là mất một phần dữ liệu gần nhất — **và lúc copy không báo lỗi gì**,
tới khi cần khôi phục mới biết.

Đo thật trên gói dữ liệu ngày 29/08/2026 (`.db` 224KB, `-wal` 4.1MB chưa gộp):

| | Đầy đủ | Chỉ copy `.db` |
|---|---|---|
| `integrity_check` | ok | **ok** |
| Đơn hàng | 219 | 201 |
| Khách hàng | 207 | 190 |

Mất 18 đơn, mà bản thiếu **vẫn báo `integrity_check: ok`**. Nó không hỏng — nó chỉ
thiếu, và không có gì báo cho bạn biết.

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

`scripts/backup-vps.sh` là điểm vào cho cron: chụp DB, đối chiếu, đóng gói kèm
ảnh, rồi đẩy lên Drive bằng `rclone` và dọn bản cũ hơn 30 ngày ở cả hai đầu.

Máy chủ **không cần cài Node**: mọi thao tác SQLite chạy bên trong container
(container có sẵn Node + better-sqlite3).

Gói backup để ở `/opt/backups/tram-banh` — **ngoài thư mục mã nguồn**, để một lệnh
`git clean -fdx` trong repo không thổi bay mất bản lùi cuối cùng. Giữ **7 bản trên
máy chủ** (khôi phục nhanh) và **30 ngày trên Drive** (kho dài hạn).

Cài một lần trên VPS:

```bash
# 1) Cài rclone và nối với Google Drive
apt install -y rclone
rclone config          # xem bảng dưới

# 2) Chạy thử một phát, rồi vào Drive kiểm tra file đã lên chưa
/opt/apps/tram-banh/scripts/backup-vps.sh

# 3) Đặt lịch 2h sáng hằng ngày
crontab -e
# 0 2 * * * /opt/apps/tram-banh/scripts/backup-vps.sh >> /var/log/tram-banh-backup.log 2>&1
```

Trả lời `rclone config` (remote hiện dùng tên `backup_trambanh_drive`):

| Câu hỏi | Trả lời |
|---|---|
| `name>` | `backup_trambanh_drive` (khớp `DICH_RCLONE` trong script) |
| `Storage>` | `drive` |
| `client_id` / `client_secret` | để trống |
| `scope>` | **`drive.file`** |
| `root_folder_id`, `service_account_file` | để trống |
| `Edit advanced config?` | `n` |
| `Use web browser...?` | `y` — nhưng đọc ghi chú bên dưới |
| `Shared Drive?` | `n` |

Chọn **`drive.file`** chứ đừng chọn `drive` (toàn quyền): `drive.file` chỉ cho
rclone thấy đúng những file do chính nó tạo, không đọc/xoá được thứ gì khác trong
Drive. Backup không cần hơn thế.

> **Bước xác thực trên máy chủ không có trình duyệt:** mở thêm một terminal và
> chạy `ssh -i ~/.ssh/tram-banh-deploy -L 53682:localhost:53682 root@<ip>`, để
> nguyên đó. Rồi trả lời `y`, copy địa chỉ `http://127.0.0.1:53682/auth?...`
> rclone in ra và dán vào trình duyệt trên máy mình.

Script **cố tình thoát với lỗi** nếu chưa có `rclone`: gói backup nằm cùng ổ đĩa
với bản gốc thì không phải backup, và im lặng trong trường hợp đó là nguy hiểm.

> **Vì sao có `--drive-use-trash=false`:** Google Drive giữ Thùng rác 30 ngày và
> phần đó **vẫn tính vào dung lượng**. Để mặc định thì mỗi gói dọn đi còn ăn chỗ
> thêm 30 ngày nữa — tốn gấp đôi mà chẳng để làm gì.

> Logic trong `backup-vps.sh` là bản viết lại cho shell của `src/lib/backup.ts`.
> Bản TypeScript (`npm run backup`, dùng ở máy dev) mới là bản có unit test. Sửa
> một bên nhớ sửa bên kia.

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

### Môi trường test (cổng 4000)

Chạy song song với bản thật để thử phiên bản mới **trên dữ liệu thật**, mà không
đụng gì tới bản đang phục vụ tiệm.

```
/opt/apps/tram-banh        ← THẬT, cổng 3000
/opt/apps/tram-banh-test   ← TEST, cổng 4000, data/ riêng
```

Hai thư mục tách hẳn nên Compose tự đặt tên project khác nhau, hai bộ container
không giẫm nhau. **Không bao giờ cho hai bản dùng chung `data/`** — bản test có
schema mới sẽ chạy migration lên chính DB của tiệm, và mọi thao tác thử nghiệm
sẽ ghi vào đơn thật.

Dựng lần đầu:

```bash
git clone -b xay-dung-app https://github.com/phantien02/tramBanh.git /opt/apps/tram-banh-test
cd /opt/apps/tram-banh-test
cp /opt/apps/tram-banh/.env .env        # dùng chung SESSION_SECRET cho đỡ phải đăng nhập lại
./scripts/sync-tu-prod.sh               # nạp dữ liệu lần đầu (tự dựng container)
docker compose -f docker-compose.test.yml up -d --build
```

Nạp lại dữ liệu mới bất cứ lúc nào:

```bash
cd /opt/apps/tram-banh-test && ./scripts/sync-tu-prod.sh
```

Đang chạy tự động **0h hằng đêm** (log ở `/var/log/tram-banh-sync.log`):

```
0 0 * * * cd /opt/apps/tram-banh-test && ./scripts/sync-tu-prod.sh >> /var/log/tram-banh-sync.log 2>&1
```

Lịch trong đêm: **00:00** sync thật → test, **02:00** backup bản thật lên Drive.
Hai việc không đụng nhau.

> Sync **tự bật lại container test**. Nếu bạn `docker compose down` bản test cho
> kín thì nửa đêm nó sống lại. Muốn tắt hẳn thì gỡ luôn dòng cron này.

Sync là **một chiều, thật → test**, và bản thật chỉ bị *đọc*: bản chụp lấy bằng
`VACUUM INTO` chạy bên trong container thật nên nó không phải dừng phút nào.
Script tự thoát nếu `PROD_DIR` và `TEST_DIR` trỏ cùng một chỗ.

**Bản test là tấm gương, không phải sân chơi.** Mỗi lần sync sẽ ghi đè toàn bộ
DB test — đơn bạn tạo thử ở đó biến mất. Sync chạy tay, không có cron, nên bạn
chủ động lúc nào muốn làm mới.

> ⚠️ Cổng 4000 mở công khai và chứa **dữ liệu khách thật** (tên, số điện thoại).
> Đây là lựa chọn có cân nhắc để tiện thử trên điện thoại, đổi lại là nhân đôi
> chỗ có thể rò rỉ thông tin khách. Xong việc thì tắt đi:
> `docker compose -f docker-compose.test.yml down`

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
