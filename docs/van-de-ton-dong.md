# Vấn đề tồn đọng & hướng giải quyết

> Ghi lần đầu **2026-08-03**. **Cập nhật 2026-08-29** sau khi chuyển toàn bộ ứng
> dụng từ Google Cloud sang VPS thuê ngoài. Đây là những việc **chưa làm**, kèm
> hiện trạng đã kiểm chứng và hướng xử lý đề xuất — để bàn bạc rồi quyết định,
> chưa phải kế hoạch chốt.
>
> Thứ tự trong file này là **thứ tự ưu tiên đề nghị**.

## Bối cảnh hạ tầng (đã đổi ngày 2026-08-29)

Ứng dụng chạy trên **VPS 103.20.102.216**, Ubuntu 24.04, 2 vCPU / 3.8GB RAM +
1.9GB swap / 33GB đĩa, user `root`, truy cập qua `http://103.20.102.216:3000`.

- Thư mục mã: `/opt/apps/tram-banh` — nhánh `xay-dung-app`
- Dữ liệu: `/opt/apps/tram-banh/data` (bind mount, **không** phải named volume)
- Deploy: `cd /opt/apps/tram-banh && git pull && docker compose up -d --build`
- Múi giờ máy chủ đã đặt `Asia/Ho_Chi_Minh` (máy giao mặc định Europe/London)

**Chỉ còn một môi trường.** Môi trường test cổng 3001 trên máy cũ đã bỏ, không
dựng lại. Muốn có lại thì phải làm mới.

### Vì sao phải chuyển

VM Google Cloud `instance-vibe-apps-server` (IP cũ `35.247.154.93`) bị GCP **tự
động dừng do hết credit free trial**. Khởi động lại được nhưng IP đổi thành
`34.21.135.136` — dấu hiệu IP là loại ephemeral, không giữ được.

### Kết quả chuyển dữ liệu (đã kiểm chứng)

| Hạng mục | Kết quả |
|---|---|
| Đơn hàng | 219 |
| Khách hàng | 207 |
| Nhân viên | 14 |
| Dòng hàng trong đơn | 224 |
| Ảnh upload | 426 file |
| Toàn vẹn DB | `integrity_check: ok` |
| Checksum gói dữ liệu | khớp ở cả 3 nơi (VM cũ → máy dev → VPS mới) |

`SESSION_SECRET` giữ nguyên từ máy cũ nên phiên đăng nhập không bị mất.

**Cách chuyển đã dùng, và nó chứng minh được điều gì:** dừng container
(`docker compose down`) rồi mới đóng gói cả thư mục `data/` — gồm **cả file
`-wal` 4.1MB chưa gộp**. Bản sao đó bung ra mở lại thành công, đủ dữ liệu tới đơn
cuối cùng. Đây là bằng chứng thực tế cho cảnh báo ở mục 2 bên dưới: nếu chỉ copy
`tram-banh.db` mà bỏ `-wal`, đã mất phần lớn dữ liệu gần nhất mà **không có lỗi
nào báo ra**.

---

## 0. Việc chuyển VPS làm hai thứ *tệ đi* — cần biết

**Mức độ: cần xử lý ngay.**

Không phải mọi thứ đều nguyên vẹn sau khi chuyển. Hai lớp bảo vệ bị mất:

1. **Không còn snapshot đĩa của GCP.** Hướng giải quyết "Lớp 1" ở mục 2 (bật
   snapshot lịch tự động của Google) là lời khuyên viết cho hạ tầng cũ — **giờ
   không áp dụng được nữa**. Cần kiểm tra nhà cung cấp VPS mới có dịch vụ snapshot
   /backup không, và giá bao nhiêu. Nếu không có, phải bù bằng backup đẩy ra ngoài
   máy (mục 2).
2. **Các bản `data-backup-*` copy tay đã mất theo VM cũ.** Trên máy cũ có 4 thư
   mục backup thủ công (13/07, 24/07, 02/08). Chúng **không được chuyển sang** —
   khi xóa VM là mất hẳn. Hiện chỉ còn đúng **một** bản sao ngoài máy chủ:
   `tram-banh-backup-20260829.tar.gz` (64MB) trên máy dev Windows, trong thư mục
   `Công việc`.

Nói cách khác: hiện tại **toàn bộ lịch sử backup của dự án là một file duy nhất,
nằm trên một cái laptop**. Đây là trạng thái mong manh nhất từ trước tới nay.

### Việc còn treo trên máy cũ

VM Google Cloud vẫn nên được **Stop** rồi **Delete** (cả VM, đĩa lẫn snapshot nếu
có) để không phát sinh chi phí. Trên đó còn một app khác tên `baocaoxuthe-agent` —
đã **chủ động quyết định bỏ**, không chuyển sang.

---

## 1. Bảo mật

**Mức độ: cần xử lý ngay.**

### Hiện trạng

Vấn đề cũ **vẫn còn nguyên**, cộng thêm vấn đề mới của VPS:

| Vấn đề | Trạng thái |
|---|---|
| Đăng nhập app bằng `admin` / `admin123` | ❌ chưa đổi (theo sang máy mới cùng DB) |
| Cổng 3000 mở thẳng ra internet, không HTTPS | ❌ vẫn vậy |
| SSH bằng **mật khẩu root** | ❌ **mới** — VPS bật sẵn |
| Mật khẩu root do nhà cung cấp cấp | ❌ **mới** — đã lộ trong hội thoại chat, cần đổi |

Bất kỳ ai biết IP đều xem và sửa được toàn bộ đơn hàng cùng số điện thoại của 207
khách. Riêng SSH mật khẩu root mở ra internet sẽ bị dò tự động trong vòng vài giờ.

*Điểm sáng nhỏ:* 19 số điện thoại khách từng bị nhân đôi sang môi trường test giờ
không còn vấn đề — môi trường test đã bỏ cùng máy cũ.

### Hướng giải quyết, theo thứ tự

1. **Đổi mật khẩu root VPS**: `ssh -i ~/.ssh/tram-banh-deploy root@103.20.102.216 passwd`
2. **Tắt đăng nhập SSH bằng mật khẩu**, chỉ để lại khóa (`PasswordAuthentication no`)
   — giống cấu hình VM cũ. Khóa `~/.ssh/tram-banh-deploy` đã nạp lên và dùng được.
   **Phải xác nhận khóa vào được trước khi tắt**, kẻo tự khóa mình ngoài cửa.
3. **Đổi mật khẩu admin của app** (Quản lý → Nhân viên).
4. **Đóng cổng 3000 khỏi internet**, cho truy cập qua **Cloudflare Tunnel**. Việc
   này đồng thời cấp HTTPS miễn phí — là điều kiện bắt buộc của mục 3 bên dưới,
   nên làm một lần được hai việc. Lưu ý VPS mới **không có firewall của GCP** như
   máy cũ; phải dùng `ufw` trên máy hoặc firewall của nhà cung cấp.

---

## 2. Chưa có cơ chế backup — 🟡 XONG MỘT NỬA 2026-08-31

**Mức độ: cần xử lý sớm — và giờ cấp thiết hơn trước.**

### Cập nhật 2026-08-31 — công cụ đã có, chưa cắm vào máy chủ

| Việc | Trạng thái |
|---|---|
| Script backup đúng cách (`VACUUM INTO` + kiểm tra + xoay vòng) | ✅ `npm run backup`, 9 test |
| Điểm vào cho cron + đẩy lên Drive | ✅ `scripts/backup-vps.sh` |
| Hướng dẫn cài đặt từng bước | ✅ README, mục "Sao lưu" |
| **Cài rclone + nối Google Drive trên VPS** | ❌ **cần bạn làm** (có bước đăng nhập Google) |
| **Đặt cron trên VPS** | ❌ **cần bạn làm** |
| Kiểm tra nhà cung cấp VPS có snapshot không | ❌ chưa |

Đã kiểm chứng ở máy dev, **trong lúc app đang mở DB**: gói ra 3.0MB, giải nén lại
thì `integrity_check: ok`, 13 bảng / 141 dòng **khớp 100%** bản gốc, 27 ảnh đủ.

Có một giả định **chưa kiểm chứng được** vì đã thống nhất không đụng VPS: máy chủ
có sẵn Node hay không. `scripts/backup-vps.sh` tự kiểm tra và in lệnh cài nếu
thiếu, nhưng nên `node -v` một phát trước khi đặt cron.

**Cho tới khi hai dòng ❌ ở trên được làm, tình trạng vẫn y nguyên như mô tả bên
dưới: cả lịch sử backup của dự án là một file trên một cái laptop.**

### Hiện trạng

VPS mới **không có backup tự động nào**: không cron, không systemd timer, không
script, và (khác máy cũ) **không có sẵn dịch vụ snapshot của Google**. Xem mục 0.

Ba điểm yếu, cập nhật cho hạ tầng mới:

1. **Chỉ còn một bản sao ngoài máy chủ, nằm trên laptop.** Laptop hỏng hoặc mất
   file là hết đường lùi. Backup cùng chỗ với bản gốc thì không phải backup — mà
   giờ còn tệ hơn: gần như không có bản nào cả.
2. **Cách backup `cp -r data` vẫn sai với SQLite** — và đợt chuyển VPS vừa rồi đã
   chứng minh bằng số liệu thật: file `-wal` giữ **4.1MB chưa gộp** vào DB chính,
   trong khi `tram-banh.db` chỉ 224KB. Copy thiếu `-wal` là mất phần lớn dữ liệu
   gần nhất, và **lúc copy không báo lỗi gì**. Cách đúng: `VACUUM INTO` khi app
   đang chạy, hoặc `docker compose down` rồi copy trọn thư mục `data/`.
3. **Chưa rõ nhà cung cấp VPS mới có dịch vụ snapshot/backup không** — cần kiểm
   tra trong bảng điều khiển của họ. Đây là việc đầu tiên nên làm ở mục này.

### Cần tách bạch hai sự cố khác nhau

Câu hỏi thường gặp là "server sập thì mất đơn, không trả bánh được". Thực ra đó
là **hai tình huống khác hẳn nhau**, và backup chỉ giải quyết được một:

| | **A. Mất dữ liệu** | **B. Server không truy cập được** |
|---|---|---|
| Ví dụ | Đĩa hỏng, VM bị xóa, DB lỗi, xóa nhầm | Mất mạng, nhà cung cấp sự cố, container chết |
| Dữ liệu | Mất thật | **Vẫn còn nguyên** |
| Xác suất | Thấp | **Cao hơn nhiều** |
| Backup cứu được? | Có | **Không** |

Với tiệm bánh, **B mới là cái hay xảy ra** và cũng chính là cái khiến "không trả
bánh được". Backup dù tốt đến mấy cũng vô dụng lúc 8h sáng mà không ai mở được
app.

*Đợt hết credit GCP vừa rồi thực ra là tình huống **B*** — dữ liệu chưa bao giờ
mất, chỉ là không truy cập được cho tới khi bật VM lên lấy ra.

### Hướng giải quyết — 3 lớp (đã cập nhật cho VPS mới)

- **Lớp 1 — chống mất trắng:** kiểm tra nhà cung cấp VPS có **snapshot tự động**
  không, có thì bật. Nếu không có, lớp này phải nhập vào lớp 2 và lớp 2 trở thành
  bắt buộc chứ không còn là tùy chọn.
- **Lớp 2 — backup hàng ngày đúng cách, đẩy ra ngoài máy:** cron mỗi đêm dùng
  `VACUUM INTO` (cho file nhất quán kể cả khi app đang ghi) + nén thư mục ảnh, đẩy
  lên Google Drive / Google Cloud Storage / S3, giữ 30 ngày. **Bắt buộc phải ra
  khỏi VPS** — để trên cùng ổ đĩa thì vô nghĩa. Lớp này cũng bảo vệ thứ snapshot
  khó cứu: xóa nhầm đơn hôm qua mà hôm nay mới phát hiện.
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

App hiện chạy ở `http://103.20.102.216:3000` — HTTP trần, lại là địa chỉ IP (IP
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

## 4. Docker build fail ngẫu nhiên — ✅ ĐÃ SỬA 2026-08-31

**Mức độ: gây phiền, không ảnh hưởng bản đang chạy.** *(giữ lại phần phân tích bên
dưới làm hồ sơ; cách sửa và bằng chứng kiểm chứng ở cuối mục)*

### Hiện trạng

`docker compose build` fail ngẫu nhiên với lỗi
`Failed to collect page data for /api/<route nào đó>`; build lại y nguyên thì pass.
Ngày 2026-08-03 dính **2 trong 4 lần** build trên máy cũ. Ngày 2026-08-29, lúc
dựng VPS mới, dính **1 trong 2 lần** — route báo lỗi lần này là
`/api/banh-options/[id]`, chứng tỏ route cụ thể chỉ là ngẫu nhiên, không cố định.

### Nguyên nhân (đã xác định)

Trong `src/db/index.ts`, hàm `taoDb()` gọi `migrate()` **không kèm điều kiện**
(dòng 21), trong khi `seedNeuTrong(db)` ngay bên dưới (dòng 25) đã được chặn bằng
`process.env.NEXT_PHASE !== 'phase-production-build'` — kèm comment giải thích
đúng lý do: lúc `next build` thu thập page-data, nhiều worker import cùng module
này và đua nhau ghi vào cùng một file SQLite. `migrate()` dính đúng cái bẫy đó
nhưng bị bỏ sót.

Đã xác nhận thêm: `data` nằm trong `.dockerignore`, nên lúc build DB trong image
là **rỗng hoàn toàn** — `migrate()` phải tạo toàn bộ bảng từ đầu, đúng lúc nhiều
worker chạy song song. Khớp với cơ chế lỗi.

### Hướng giải quyết

Đưa `migrate()` vào cùng điều kiện `NEXT_PHASE` như seed. An toàn với runtime vì
`NEXT_PHASE` chỉ được đặt trong lúc `next build`; khi chạy thật (`node server.js`)
biến này rỗng nên migration vẫn chạy bình thường lúc container khởi động.

**Cần kiểm chứng khi sửa:** phải chắc rằng lúc `next build` không có route nào
thực sự *truy vấn* DB (chỉ import module thôi). Nếu có, bỏ `migrate()` sẽ đổi lỗi
"đua ghi" thành lỗi "no such table". Viết test kèm theo, đừng sửa chay.

Sửa nhanh, nhưng nên làm lúc không deploy giữa chừng vì đụng vào logic migration.

### Đã sửa thế nào (2026-08-31)

`migrate()` được đưa vào **cùng khối điều kiện** `NEXT_PHASE` với `seedNeuTrong()`
trong `src/db/index.ts`. `taoDb()` được export để test được, kèm 2 test trong
`src/db/index.test.ts`.

### Bằng chứng kiểm chứng

Điều kiện tài liệu đặt ra ở trên **đã được kiểm chứng bằng cách mô phỏng đúng môi
trường Docker** — chạy `next build` với `DATA_DIR` trỏ vào thư mục rỗng hoàn toàn
(giống hệt tình huống `data` bị `.dockerignore` loại bỏ):

| Tình huống | Kết quả đo được | Ý nghĩa |
|---|---|---|
| `next build`, `DATA_DIR` rỗng | Build **pass**, sinh 23 trang bằng **3 worker song song** | Không route nào lỗi "no such table" → không route nào truy vấn DB lúc build |
| DB sau khi build xong | **0 bảng** | `migrate()` thật sự không chạy lúc build |
| `next start`, cùng `DATA_DIR` rỗng đó | **14 bảng + 1 user** đã seed, `GET /login` → 200 | Runtime vẫn migrate & seed bình thường |

Hai dòng đầu chứng minh cái cần sửa đã hết; dòng cuối chứng minh không làm hỏng
lúc chạy thật. Đây là kiểm chứng **tất định**, không phải "build lại vài lần thấy
không fail" — vốn vô nghĩa với một lỗi ngẫu nhiên.

---

## Việc nhỏ khác

- ~~**`CONG_KHAI` trong `src/proxy.ts` có mục thừa**~~ — **✅ đã xử lý 2026-08-31,
  và chẩn đoán ban đầu là SAI.** Ghi lại để không ai mắc lại.

  Bản ghi cũ nói `/huong-dan` với `/kiem-thu` là mục thừa vì không có thư mục
  `src/app/huong-dan` / `src/app/kiem-thu` và cả hai trả 404, nên "dọn cho khớp
  thực tế". **Xóa đi là hỏng việc.** Middleware khớp theo *tiền tố*
  (`pathname.startsWith(p)`), còn `public/` thì có sẵn ba file tĩnh:
  `huong-dan.html`, `kiem-thu-ky-thuat.html`, `kiem-thu-nhan-vien.html`. Chính hai
  mục đó đang cho phép mở HDSD và 2 phiếu kiểm thử **mà không cần đăng nhập**. Đo
  thật trên server (không kèm cookie):

  | Đường dẫn | Trước khi sửa | Sau khi sửa |
  |---|---|---|
  | `/huong-dan.html` | 200 | 200 |
  | `/kiem-thu-ky-thuat.html` | 200 | 200 |
  | `/kiem-thu-nhan-vien.html` | 200 | 200 |
  | `/logo.svg` | 200 | 200 |
  | `/huong-dan` (không `.html`) | 404 | 307 → `/login` |
  | `/login-gia-mao` | **200 — lọt** | 307 → `/login` |

  Sai lầm của bản ghi cũ: chỉ thử đường dẫn **không có `.html`**, thấy 404 rồi kết
  luận mục đó vô dụng.

  Vấn đề thật nằm chỗ khác: khớp theo tiền tố quá lỏng nên **bất kỳ đường dẫn nào
  ăn theo cũng thành công khai** — `/login-gia-mao` từng trả 200. Đã đổi sang khớp
  **chính xác** bằng `Set.has()` với đủ 6 đường dẫn, tách hàm `laCongKhai()` ra
  cho test được, kèm 12 test trong `src/proxy.test.ts`.

  *Bài học: trước khi xóa một mục cấu hình vì "trông có vẻ thừa", phải thử đúng
  đường dẫn mà nó đang phục vụ.*
- **Môi trường test đã mất** cùng máy cũ. `docker-compose.test.yml` chỉ nằm trên
  VM Google Cloud, không commit vào repo, nên **không còn nữa**. Muốn dựng lại
  môi trường test trên VPS mới thì phải viết lại từ đầu — lần này nên commit vào
  repo.
- **Build cache** trên VPS mới còn sạch. Khi nào đầy thì dọn bằng
  `docker builder prune`.
