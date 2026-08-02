# Vấn đề tồn đọng & hướng giải quyết

> Ghi lại ngày **2026-08-03**, sau đợt deploy bản "gọn luồng đơn + ảnh phụ kiện"
> lên server. Đây là những việc **chưa làm**, kèm hiện trạng đã kiểm chứng và
> hướng xử lý đề xuất — để bàn bạc rồi quyết định, chưa phải kế hoạch chốt.
>
> Thứ tự trong file này là **thứ tự ưu tiên đề nghị**.

## Bối cảnh hạ tầng

VM Google Cloud `instance-vibe-apps-server`, IP `35.247.154.93`, hai môi trường
chạy song song, dữ liệu tách hoàn toàn:

| | Production | Test |
|---|---|---|
| Cổng | 3000 | 3001 |
| Thư mục mã | `/opt/apps/tram-banh` | `~/tramBanh` |
| Dữ liệu | `/opt/apps/tram-banh/data` | `~/trambanh-fix-data` |
| Nội dung | 24 đơn / 19 khách thật | bản sao dữ liệu thật (clone 2026-08-03) |

---

## 1. Bảo mật: mật khẩu mặc định + cổng mở ra internet

**Mức độ: cần xử lý ngay.**

### Hiện trạng (đã kiểm chứng)

- Cả hai môi trường vẫn đăng nhập được bằng **`admin` / `admin123`** (mật khẩu
  seed mặc định).
- Cả cổng 3000 lẫn 3001 đều **truy cập được từ internet** (test từ ngoài, cùng
  trả HTTP 200).
- Sau khi clone dữ liệu sang môi trường test, **19 số điện thoại khách thật giờ
  nằm ở cả hai nơi**.

Nghĩa là bất kỳ ai biết IP đều xem và sửa được toàn bộ đơn hàng cùng thông tin
khách. README đã dặn "đổi mật khẩu ngay" nhưng thực tế chưa đổi.

### Hướng giải quyết

1. **Đổi mật khẩu admin** (Quản lý → Nhân viên). Hai DB tách biệt nên **phải đổi
   riêng trên từng cổng**.
2. **Đóng cổng 3000/3001 khỏi internet** bằng GCP firewall, cho truy cập qua
   **Cloudflare Tunnel**. Việc này đồng thời cấp HTTPS miễn phí — là điều kiện
   bắt buộc của mục 3 bên dưới, nên làm một lần được hai việc.

---

## 2. Chưa có cơ chế backup

**Mức độ: cần xử lý sớm.**

### Hiện trạng (đã kiểm chứng)

Production **không có backup tự động nào** — không cron, không systemd timer,
không script. Chỉ có vài thư mục `data-backup-*` copy tay, và có khoảng trống
**20 ngày** (2026-07-13 → 2026-08-02) không bản nào.

Ba điểm yếu:

1. **Mọi bản backup nằm cùng ổ đĩa, cùng VM với bản gốc.** Đĩa hỏng hoặc VM bị
   xóa là mất sạch cả gốc lẫn backup. Backup cùng chỗ với bản gốc thì không phải
   backup.
2. **Cách backup đang dùng (`cp -r data`) không an toàn với SQLite.** DB chạy chế
   độ WAL; lúc kiểm tra, file `-wal` của production đang giữ **2.6MB chưa gộp**
   vào DB chính. Copy file trong lúc app đang ghi có thể ra bản sao thiếu hoặc
   hỏng — nguy hiểm ở chỗ **lúc copy không báo lỗi gì**, chỉ khi cần khôi phục
   mới biết. Cách đúng là `VACUUM INTO` (đã dùng thành công khi clone dữ liệu
   production sang môi trường test).
3. Chưa rõ **GCP snapshot schedule** đã bật chưa — cần kiểm tra trong Console
   (Compute Engine → Snapshots → Snapshot schedules).

### Cần tách bạch hai sự cố khác nhau

Câu hỏi thường gặp là "server sập thì mất đơn, không trả bánh được". Thực ra đó
là **hai tình huống khác hẳn nhau**, và backup chỉ giải quyết được một:

| | **A. Mất dữ liệu** | **B. Server không truy cập được** |
|---|---|---|
| Ví dụ | Đĩa hỏng, VM bị xóa, DB lỗi, xóa nhầm | Mất mạng, GCP sự cố, container chết |
| Dữ liệu | Mất thật | **Vẫn còn nguyên** |
| Xác suất | Thấp | **Cao hơn nhiều** |
| Backup cứu được? | Có | **Không** |

Với tiệm bánh, **B mới là cái hay xảy ra** và cũng chính là cái khiến "không trả
bánh được". Backup dù tốt đến mấy cũng vô dụng lúc 8h sáng mà không ai mở được
app.

### Hướng giải quyết — 3 lớp

- **Lớp 1 — chống mất trắng (~5 phút, làm một lần):** bật **snapshot lịch tự
  động** của GCP cho ổ đĩa VM. Snapshot nằm ở hệ thống lưu trữ riêng của Google,
  VM chết vẫn còn. Chi phí cỡ vài nghìn đồng/tháng. Đây là việc đáng làm nhất.
- **Lớp 2 — backup hàng ngày đúng cách:** cron mỗi đêm dùng `VACUUM INTO` (cho
  file nhất quán kể cả khi app đang ghi) + nén thư mục ảnh, đẩy lên Google Cloud
  Storage hoặc Google Drive, giữ 30 ngày. Lớp này bảo vệ thứ snapshot khó cứu:
  xóa nhầm đơn hôm qua mà hôm nay mới phát hiện.
- **Lớp 3 — chống "không vào được app":** app **đã có sẵn** chức năng xuất Excel
  ở *Quản lý → Đơn*. Biến thành thói quen: mỗi sáng xuất danh sách đơn trong
  ngày hoặc in ra giấy. Server sập lúc nào cũng vẫn biết hôm nay giao bánh gì cho
  ai. Rẻ nhất, không cần code, và hiệu quả nhất cho đúng nỗi lo trên.
  Muốn tự động hơn: mỗi sáng bắn file Excel đơn trong ngày vào Zalo/Telegram.

---

## 3. Thông báo cho nhân viên (Web Push)

**Mức độ: tính năng mong muốn, chưa cấp bách.**

### Hiện trạng

App đã có SSE realtime + tiếng chuông (`src/components/useRealtime.ts`), cộng
nhắc nhở tự động khi đơn còn 2 tiếng nữa tới giờ giao (quét mỗi 60 giây).

**Hạn chế:** chuông chỉ kêu khi **trang đang mở**. Đóng tab, khóa máy, tablet ngủ
→ không có gì hết.

### Vì sao chọn Web Push chứ không phải Zalo

Nhu cầu là **báo nội bộ cho nhân viên** (bếp có đơn mới, quầy có bánh xong),
không đụng tới khách.

| | Web Push (PWA) | Telegram bot | Zalo OA / ZNS |
|---|---|---|---|
| Chi phí | Miễn phí | Miễn phí | **Trả tiền mỗi tin** |
| Thủ tục | Không | Không | **Cần giấy phép KD, duyệt OA, duyệt mẫu tin** |
| Công sức | ~1 ngày công | Rất ít | Nhiều |
| Nhân viên cần làm gì | Bấm "Bật thông báo" 1 lần | Cài Telegram | Đã có Zalo sẵn |
| Gửi cho khách | Không hợp | Không hợp | **Đúng bài** |

→ **Web Push** cho nội bộ: nhân viên không phải cài thêm ứng dụng nào, chỉ mở
đúng app đang dùng hằng ngày. **Zalo ZNS** để dành cho việc báo *khách* ("bánh
của bạn đã xong") ở giai đoạn sau, khi sẵn sàng làm thủ tục OA.

### ⚠️ Điều kiện bắt buộc: phải có HTTPS trước

**Web Push chỉ chạy trên HTTPS** — service worker không đăng ký được trên HTTP
thường, đây là quy định cứng của trình duyệt, không lách được.

App hiện chạy ở `http://35.247.154.93:3000` — HTTP trần, lại là địa chỉ IP (IP
trần gần như không xin được chứng chỉ). **Nên phải làm mục 1 (Cloudflare Tunnel
+ HTTPS) trước, rồi mới làm được mục này.**

### Cần xây những gì

Kiến trúc hiện tại rất thuận: cả 4 loại sự kiện đều đi qua **đúng một hàm**
`phatSuKien()` trong `src/lib/sse.ts`.

| Sự kiện | Phát ra từ | Ai cần biết |
|---|---|---|
| `don_moi` | `orders-service.ts:116` | **Bếp** — có đơn mới cần làm |
| `chuyen_trang_thai` → `banh_xong` | `orders-service.ts:184` | **Quầy** — bánh xong, ra giao khách |
| `nhac_nho` | `reminder-job.ts:19` | **Bếp** — đơn còn 2 tiếng nữa tới giờ |
| `don_cap_nhat` | `orders-service.ts:151` | **Bếp** — đơn vừa bị sửa |

Danh sách việc:

1. `public/manifest.json` + icon — để app cài được vào màn hình chính *(chưa có)*
2. `public/sw.js` — service worker nhận push, hiện thông báo, bấm vào mở đúng đơn
   *(chưa có)*
3. Bảng DB mới lưu subscription (gắn `userId` + `vaiTro`)
4. `src/lib/push.ts` — gửi push bằng thư viện `web-push` + cặp khóa VAPID
5. Thêm một chỗ gọi push trong `phatSuKien()`, định tuyến theo vai trò như bảng trên
6. Hai API: đăng ký / hủy đăng ký
7. Nút "🔔 Bật thông báo" trong `AppShell` — bắt buộc do người dùng bấm, trình
   duyệt không cho tự xin quyền

**Khác biệt kỹ thuật đáng lưu ý:** SSE hiện phát cho *tất cả* client rồi để từng
trang tự lọc ở phía máy khách. Push thì phải lọc **ở server** — không thể bắn
"đơn mới" cho quầy hay "bánh xong" cho bếp. Vì vậy mới cần lưu vai trò kèm
subscription.

### Giới hạn cần biết trước

- **iPhone/iPad:** chỉ nhận push nếu nhân viên **"Thêm vào màn hình chính"**
  (Safari → Chia sẻ → Thêm vào MH chính). Mở bằng Safari thường thì không có.
  Hạn chế của Apple, iOS 16.4 trở lên. Android/Chrome không cần bước này.
- **Mỗi máy phải bật riêng.** Đổi điện thoại hoặc xóa dữ liệu trình duyệt là phải
  bật lại.
- **Không thay thế chuông hiện tại, mà bổ sung.** Tablet bếp luôn mở màn hình thì
  chuông SSE vốn đã tốt. Push có giá trị ở chỗ khác: điện thoại riêng của nhân
  viên, tablet đã ngủ, đơn đặt lúc nghỉ trưa.
- **Android có thể trễ vài phút** nếu bật tiết kiệm pin gắt. Với bánh đặt trước
  thì không thành vấn đề.

**Ước lượng:** khoảng **1 ngày công**, với điều kiện HTTPS đã xong trước.

---

## 4. Docker build fail ngẫu nhiên

**Mức độ: gây phiền, không ảnh hưởng bản đang chạy.**

### Hiện trạng

`docker compose build` fail ngẫu nhiên với lỗi
`Failed to collect page data for /api/customers`; build lại y nguyên thì pass.
Ngày 2026-08-03 dính **2 trong 4 lần** build trên server.

### Nguyên nhân (đã xác định)

Trong `src/db/index.ts`, hàm `taoDb()` gọi `migrate()` **không kèm điều kiện**,
trong khi `seedNeuTrong(db)` ngay bên dưới đã được chặn bằng
`process.env.NEXT_PHASE !== 'phase-production-build'` — kèm comment giải thích
đúng lý do: lúc `next build` thu thập page-data, nhiều worker import cùng module
này và đua nhau ghi vào cùng một file SQLite. `migrate()` dính đúng cái bẫy đó
nhưng bị bỏ sót.

### Hướng giải quyết

Đưa `migrate()` vào cùng điều kiện `NEXT_PHASE` như seed. An toàn với runtime vì
`NEXT_PHASE` chỉ được đặt trong lúc `next build`; khi chạy thật (`node server.js`)
biến này rỗng nên migration vẫn chạy bình thường lúc container khởi động.

Sửa nhanh, nhưng nên làm lúc không deploy giữa chừng vì đụng vào logic migration.

---

## Việc nhỏ khác

- **Build cache trên server** đang chiếm ~4.7GB, dọn được bằng
  `docker builder prune`. Chưa gấp (còn 83GB trống).
- **`docker-compose.test.yml`** của môi trường test hiện chỉ nằm trên server,
  không commit vào repo. Nếu muốn chuẩn hóa thì đưa vào.
