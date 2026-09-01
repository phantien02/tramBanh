# Vận hành — những lệnh hay dùng

Sổ tay dùng hằng ngày. Chi tiết kỹ thuật ở [README.md](../README.md); việc còn
tồn ở [van-de-ton-dong.md](van-de-ton-dong.md).

Mọi lệnh dưới đây chạy trên máy dev Windows, tự SSH sang máy chủ.

---

## Hai môi trường

| | Bản THẬT | Bản TEST |
|---|---|---|
| Địa chỉ | `http://103.20.102.216:3000` | `http://103.20.102.216:4000` |
| Thư mục | `/opt/apps/tram-banh` | `/opt/apps/tram-banh-test` |
| Dữ liệu | thật, tiệm đang dùng | bản chụp từ bản thật lúc 0h |
| Phiên bản | cũ (`efdb394`) | mới |

**Bản test là tấm gương, không phải sân chơi** — mọi thứ bạn tạo ở đó bị xoá lúc 0h.

## Lịch tự động

```
00:00   sync bản thật → bản test
02:00   backup bản thật → Google Drive
```

---

## Kiểm tra buổi sáng

Một lệnh xem cả hai việc đêm qua có chạy không:

```bash
ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216 'echo "--- SYNC 0h ---"; tail -8 /var/log/tram-banh-sync.log; echo; echo "--- BACKUP 2h ---"; tail -10 /var/log/tram-banh-backup.log; echo; echo "--- GOI TREN DRIVE ---"; rclone ls backup_trambanh_drive:tram-banh-backup/'
```

Cần thấy: log backup kết thúc bằng `Xong. Trên Drive hiện có:`, và số gói trên
Drive tăng thêm 1 mỗi ngày (tối đa 30).

## Kiểm gói backup có đúng, đủ không

```bash
ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216 'cd /opt/apps/tram-banh-test && ./scripts/kiem-backup.sh'
```

Tải gói mới nhất **từ Drive** về rồi so từng đơn với bản thật: mã đơn, tổng tiền,
tiền cọc, trạng thái, giờ giao, hình thức nhận, SĐT + tên khách, số món.

Kết thúc bằng `✅ GÓI BACKUP CHUẨN` là đạt.

**Đọc kết quả thế nào:**

- `khớp từng trường` = tổng số đơn trong gói → phải khớp hết
- `LỆCH nội dung` và `KHÔNG thấy ở bản thật` → **phải là 0**
- `Đơn tạo SAU khi backup` → **bình thường**, không phải lỗi. Nhưng để ý con số
  này có hợp lý với lượng đơn tiệm bán không. Tiệm bán 5 đơn/ngày mà báo 0 thì
  đáng nghi — có thể đang backup nhầm dữ liệu cũ.
- Số ảnh phải tăng dần theo ngày.

Kiểm gói cũ hoặc gói trên máy chủ:

```bash
./scripts/kiem-backup.sh tram-banh-backup-2026-08-30.tar.gz   # gói cụ thể
NGUON=may ./scripts/kiem-backup.sh                            # gói trên VPS, khỏi tải
```

## Nạp lại dữ liệu cho bản test ngay

Không chờ 0h:

```bash
ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216 'cd /opt/apps/tram-banh-test && ./scripts/sync-tu-prod.sh'
```

Mất ~30 giây. Bản test gián đoạn vài giây, **bản thật không ảnh hưởng** (chỉ bị đọc).

Cần chạy sau khi **đổi mật khẩu** ở bản thật — nếu không, bản test vẫn nhận mật
khẩu cũ cho tới 0h.

## Chạy backup ngay

```bash
ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216 'REPO=/opt/apps/tram-banh /opt/apps/tram-banh-test/scripts/backup-vps.sh'
```

## Bật / tắt bản test

```bash
# tắt
ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216 'cd /opt/apps/tram-banh-test && docker compose -f docker-compose.test.yml down'

# bật
ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216 'cd /opt/apps/tram-banh-test && docker compose -f docker-compose.test.yml up -d'
```

Tắt xong **0h đêm sync sẽ bật lại**. Muốn tắt hẳn phải gỡ dòng cron `0 0 * * *`.

## Khôi phục khi có sự cố

```bash
ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216
cd /opt/apps/tram-banh

# 1) Lấy gói cần dùng
rclone ls backup_trambanh_drive:tram-banh-backup/
rclone copy backup_trambanh_drive:tram-banh-backup/tram-banh-backup-YYYY-MM-DD.tar.gz /tmp/

# 2) Dừng app
docker compose down

# 3) Bung gói ra chỗ tạm
mkdir -p /tmp/phuc-hoi && tar -xzf /tmp/tram-banh-backup-YYYY-MM-DD.tar.gz -C /tmp/phuc-hoi

# 4) Thay dữ liệu — NHỚ XOÁ CẢ -wal VÀ -shm
rm -f data/tram-banh.db data/tram-banh.db-wal data/tram-banh.db-shm
cp /tmp/phuc-hoi/tram-banh.db data/
rm -rf data/uploads && cp -r /tmp/phuc-hoi/uploads data/

# 5) Bật lại
docker compose up -d
```

**Bước 4 là chỗ dễ hỏng nhất.** Không xoá `-wal`/`-shm` cũ thì SQLite sẽ gộp phần
thừa của DB cũ vào bản vừa khôi phục — ra dữ liệu lai, không phải bản backup.

**Nên diễn tập trước ở bản test** (thay `/opt/apps/tram-banh` bằng
`/opt/apps/tram-banh-test` và `docker-compose.yml` bằng `docker-compose.test.yml`).
Hỏng ở đó thì không ai thiệt.

---

## Ba chỗ dễ vô tình làm chết backup

1. **Xoá thư mục `/opt/apps/tram-banh-test`** → chết **cả sync lẫn backup**, vì
   hai cron đều gọi script từ đó (bản thật còn ở `efdb394`, chưa có script).
   Sửa được khi nâng cấp bản thật.
2. **`chmod` tay vào file trong repo** → file thành "đã sửa", `git pull` lần sau
   bị chặn, script đứng ở bản cũ mà không ai biết.
3. **`git clean -fdx`** trong repo → xoá mọi thứ bị gitignore. Gói backup đã để
   ở `/opt/backups/tram-banh` (ngoài repo) nên an toàn, đừng chuyển vào lại.

## Khi nâng cấp bản thật lên phiên bản mới

```bash
cd /opt/apps/tram-banh
git pull
docker compose up -d --build
```

Rồi **sửa hai dòng cron** cho trỏ vào bản thật thay vì bản test:

```bash
crontab -e
# 0 2 * * * /opt/apps/tram-banh/scripts/backup-vps.sh >> /var/log/tram-banh-backup.log 2>&1
```

(bỏ `REPO=...` vì mặc định đã là `/opt/apps/tram-banh`)

## Cấu hình đang dùng

| | |
|---|---|
| Remote rclone | `backup_trambanh_drive`, scope `drive.file` |
| Thư mục trên Drive | `tram-banh-backup` |
| Gói trên máy chủ | `/opt/backups/tram-banh`, giữ **7 bản** |
| Trên Drive | giữ **30 ngày**, xoá thẳng không qua Thùng rác |
| Log | `/var/log/tram-banh-backup.log`, `/var/log/tram-banh-sync.log` |
| Dung lượng Drive | 15 GiB, còn ~9.4 GiB — 30 gói × 66MB ≈ 2 GB |

## Việc thủ công đáng làm nhất

**Mỗi sáng xuất Excel đơn trong ngày** ở *Quản lý → Đơn*, hoặc in ra giấy.

Backup chống mất dữ liệu. Nhưng tình huống hay xảy ra hơn nhiều là **không vào
được app** (mất mạng, nhà cung cấp sự cố, container chết) — lúc đó dữ liệu còn
nguyên mà vẫn không biết hôm nay giao bánh gì cho ai. Tờ giấy in giải quyết đúng
cái đó, không cần code, không phụ thuộc gì.
