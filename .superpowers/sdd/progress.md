# Tiến độ Trạm Bánh
Task 1: complete (commits 8d5803a..15c205c, review approved)
  - Môi trường thực tế: Next.js 16 (không phải 15 như plan), build dùng Turbopack.
  - Fix theo review: script lint đổi `next lint` → `eslint .` (Next 16 bỏ next lint).
  - Minor ghi nhận cho final review: AGENTS.md/CLAUDE.md scaffold boilerplate còn trong repo; package.json name đổi thành tram-banh (hợp lý).
Task 2: complete (commit cbca1b1, review clean)
Task 3: complete (commit 3814689, review clean)
Task 4: complete (commit c0900c6, review clean)
Task 5: complete (commit 7ebfee3, review clean)
Task 6: complete (commit ffaf8c5, review approved)
  - Deviation bắt buộc bởi Next 16: middleware.ts → src/proxy.ts, export `proxy` (logic giữ nguyên brief).
  - OPEN plan-mandated finding (Important, chờ người dùng quyết + final review): src/lib/session.ts có fallback secret hardcode `dev-secret-thay-toi-khi-deploy` khi thiếu SESSION_SECRET — copy nguyên văn từ plan; docker-compose Task 16 sẽ bắt buộc SESSION_SECRET nên prod fail loudly.
Task 7: complete (commit f1adb9d, review approved)
  - Minor plan-mandated (final review triage): heartbeat enqueue fail không tự huyDangKy — eviction dựa vào cancel()/phatSuKien.
Task 8: complete (commit f913bce, review approved)
  - OPEN plan-mandated finding (Important, chờ người dùng quyết + final review): /api/upload không giới hạn size/MIME — file không phải ảnh sẽ 500 từ sharp; app nội bộ có auth nên rủi ro bounded.
Task 9: complete (commits 70dab9f..5e915d5, review approved)
  - Fix theo review: bỏ import thừa like/or (5e915d5).
  - Finding "race đếm mã đơn trong ngày" (plan-mandated): controller adjudicate KHÔNG phải defect thực — better-sqlite3 đồng bộ, taoDon không await giữa count và insert nên 1 process không interleave; unique(maDon) là lưới an toàn. Final review xác nhận lại.
  - Minor ghi nhận: N+1 query trong layDanhSachDon (plan choice); brief 9-16 trước đây thiếu, đã sinh lại đủ.
Task 10: complete (commit 3e35ae9, review clean)
Task 11: complete (commit 527a73d, review approved)
  - OPEN plan-mandated findings (Important, hardening pass / final review): (a) gia không validate integer/âm; (b) POST /api/users bare catch map mọi lỗi thành 409; (c) PATCH /api/users/:id không validate enum vaiTro.
  - Fixture tạo sẵn trong dev DB: quay1/123456 (quầy), bep1/123456 (bếp). Leftover deactivated: user enctest, Test Product.
  - Note môi trường: curl Git-Bash Windows corrupt UTF-8 inline -d; dùng --data-binary @file.
Task 12: complete (commit 90a9b09, review approved)
  - Minor ghi nhận: .claude/launch.json (dev config Preview tool) đi kèm commit feat; AudioContext mới mỗi lần chuông (plan-mandated pattern).
Task 13: DỞ DANG (wip commit 27c4af7) — RESUME TẠI ĐÂY
  - Cả 7 file của brief đã được viết (OrderForm, quay/page, don-moi, don/[id], don/[id]/sua, OrderDetail, api/me) nhưng CHƯA verify: chưa chạy npm test / npm run build, chưa E2E, chưa review.
  - Việc cần làm khi resume: (1) dispatch subagent verify+sửa nếu cần (đối chiếu code với task-13-brief.md, chạy test+build, E2E vòng đời đơn theo brief Step 5) rồi review như quy trình; KHÔNG viết lại từ đầu.
  - Sau đó: Task 14 (bếp), 15 (quản lý), 16 (Docker+README) → final whole-branch review (model mạnh nhất) → finishing-a-development-branch.

== HƯỚNG DẪN RESUME (cho phiên sau) ==
- Quy trình: superpowers:subagent-driven-development, plan docs/superpowers/plans/2026-07-06-tram-banh.md, brief 1-16 đủ trong .superpowers/sdd/.
- Branch: xay-dung-app. Ledger này là nguồn sự thật; đối chiếu git log.
- Môi trường: Next.js 16 (không phải 15) — middleware là src/proxy.ts (export proxy); build Turbopack; lint = `eslint .`; curl Git-Bash Windows corrupt UTF-8 inline -d → dùng --data-binary @file.
- Tài khoản dev DB: admin/admin123 (quanly), quay1/123456, bep1/123456.
- Model đã dùng: implementer haiku (task thuần transcription) / sonnet (task tích hợp, UI, server); reviewer sonnet; final review dùng model mạnh nhất.
- OPEN plan-mandated findings chờ người dùng quyết (xem chi tiết ở các mục Task 6, 8, 9, 11 phía trên): session secret fallback; upload không giới hạn size/MIME; validation gia/vaiTro/409 bare-catch.
