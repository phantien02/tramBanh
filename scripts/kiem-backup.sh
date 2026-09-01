#!/usr/bin/env bash
#
# Đối chiếu một gói backup với bản thật, tới từng đơn.
#
#   ./scripts/kiem-backup.sh              # lấy gói mới nhất trên Drive
#   ./scripts/kiem-backup.sh <tên gói>    # chỉ định gói
#   NGUON=may ./scripts/kiem-backup.sh    # lấy gói trên VPS thay vì tải từ Drive
#
# Vì sao không so "phải bằng nhau": bản thật vẫn nhận đơn sau lúc chụp, nên gói
# LUÔN thiếu vài đơn mới. So kiểu bằng nhau sẽ báo động sai mỗi ngày. Phép so
# đúng là: mọi đơn TRONG GÓI phải có y hệt ở bản thật; đơn mới hơn thì liệt kê
# ra để biết, không tính là lỗi.

set -euo pipefail

REPO="${REPO:-/opt/apps/tram-banh}"
SERVICE="${SERVICE:-tram-banh}"
TEST_DIR="${TEST_DIR:-/opt/apps/tram-banh-test}"
TEST_SERVICE="${TEST_SERVICE:-tram-banh-test}"
DICH_RCLONE="${DICH_RCLONE:-backup_trambanh_drive:tram-banh-backup}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/tram-banh}"
NGUON="${NGUON:-drive}"

dc() { docker compose --project-directory "$REPO" -f "$REPO/docker-compose.yml" "$@"; }
dct() { docker compose --project-directory "$TEST_DIR" -f "$TEST_DIR/docker-compose.test.yml" "$@"; }

TAM=$(mktemp -d)
trap 'rm -rf "$TAM"' EXIT

# ── Lấy gói cần kiểm ───────────────────────────────────────────────────────
GOI="${1:-}"
if [ "$NGUON" = "drive" ]; then
  [ -n "$GOI" ] || GOI=$(rclone lsf "$DICH_RCLONE" --include "tram-banh-backup-*.tar.gz" | sort | tail -1)
  [ -n "$GOI" ] || { echo "Không thấy gói nào trên $DICH_RCLONE" >&2; exit 1; }
  echo "Gói kiểm : $GOI  (tải từ Google Drive)"
  rclone copy "$DICH_RCLONE/$GOI" "$TAM/" --progress=false
else
  [ -n "$GOI" ] || GOI=$(ls -1 "$BACKUP_DIR"/tram-banh-backup-*.tar.gz 2>/dev/null | sort | tail -1 | xargs -r basename)
  [ -n "$GOI" ] || { echo "Không thấy gói nào trong $BACKUP_DIR" >&2; exit 1; }
  echo "Gói kiểm : $GOI  (trên máy chủ)"
  cp "$BACKUP_DIR/$GOI" "$TAM/"
fi

echo "Bản thật : đọc lúc $(date '+%Y-%m-%d %H:%M:%S')"
echo

tar -xzf "$TAM/$GOI" -C "$TAM"
SO_ANH_GOI=$(ls -1 "$TAM/uploads" 2>/dev/null | wc -l)
SO_ANH_THAT=$(ls -1 "$REPO/data/uploads" 2>/dev/null | wc -l)

# ── Chụp bản thật để so (chỉ đọc, y như cách backup làm) ───────────────────
dc exec -T "$SERVICE" rm -f /tmp/kiem-goc.db
dc exec -T "$SERVICE" node <<'JS'
const D = require('better-sqlite3')
new D('/app/data/tram-banh.db', { readonly: true }).exec("VACUUM INTO '/tmp/kiem-goc.db'")
JS
dc cp "$SERVICE:/tmp/kiem-goc.db" "$TAM/that.db"
dc exec -T "$SERVICE" rm -f /tmp/kiem-goc.db

# ── So sánh trong container test để không bắt bản thật làm việc nặng ───────
C=$(dct ps -q "$TEST_SERVICE")
[ -n "$C" ] || { echo "Container test không chạy — cần nó để so sánh." >&2; exit 1; }
docker cp "$TAM/tram-banh.db" "$C:/tmp/goi.db" >/dev/null
docker cp "$TAM/that.db" "$C:/tmp/that.db" >/dev/null

docker exec -i -e SO_ANH_GOI="$SO_ANH_GOI" -e SO_ANH_THAT="$SO_ANH_THAT" "$C" node <<'JS'
const D = require('better-sqlite3')
const goi = new D('/tmp/goi.db', { readonly: true })
const that = new D('/tmp/that.db', { readonly: true })

const iv = goi.pragma('integrity_check')[0].integrity_check
console.log('integrity_check gói :', iv)

// Vân tay từng đơn: đủ các trường mà sai một cái là đơn đã khác.
const SQL = `
  select o.ma_don,
         o.tong_tien, o.tien_coc, o.trang_thai, o.ngay_gio_nhan, o.hinh_thuc_nhan,
         ifnull(c.sdt, '') sdt, ifnull(c.ten, '') ten,
         (select count(*) from order_items i where i.order_id = o.id) so_mon
  from orders o left join customers c on c.id = o.customer_id`
const vanTay = (r) => [r.tong_tien, r.tien_coc, r.trang_thai, r.ngay_gio_nhan,
  r.hinh_thuc_nhan, r.sdt, r.ten, r.so_mon].join('|')

const mGoi = new Map(goi.prepare(SQL).all().map((r) => [r.ma_don, vanTay(r)]))
const mThat = new Map(that.prepare(SQL).all().map((r) => [r.ma_don, vanTay(r)]))

const khop = [], lech = [], thieu = []
for (const [ma, vt] of mGoi) {
  if (!mThat.has(ma)) thieu.push(ma)
  else if (mThat.get(ma) !== vt) lech.push(ma)
  else khop.push(ma)
}
const moiHon = [...mThat.keys()].filter((ma) => !mGoi.has(ma))

console.log()
console.log('Đơn trong gói backup :', mGoi.size)
console.log('Đơn ở bản thật       :', mThat.size)
console.log()
console.log('Đối chiếu ' + mGoi.size + ' đơn trong gói với bản thật:')
console.log('   khớp từng trường          :', khop.length)
console.log('   LỆCH nội dung             :', lech.length, lech.length ? '<-- ' + lech.slice(0, 10).join(', ') : '')
console.log('   KHÔNG thấy ở bản thật     :', thieu.length, thieu.length ? '<-- ' + thieu.slice(0, 10).join(', ') : '')
console.log()

if (moiHon.length) {
  console.log('Đơn tạo SAU khi backup (bình thường, không phải lỗi):', moiHon.length)
  const ct = that.prepare(`
    select o.ma_don, o.ngay_gio_nhan, ifnull(c.ten,'(không tên)') ten
    from orders o left join customers c on c.id = o.customer_id
    where o.ma_don = ?`)
  for (const ma of moiHon.slice(0, 10)) {
    const r = ct.get(ma)
    const d = new Date(r.ngay_gio_nhan)
    const p = (n) => String(n).padStart(2, '0')
    console.log('   ' + r.ma_don + '  giao ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + '  ' + r.ten)
  }
  if (moiHon.length > 10) console.log('   … và ' + (moiHon.length - 10) + ' đơn nữa')
  console.log()
}

// Các bảng khác: gói không được NHIỀU hơn bản thật, và không được hụt vô lý.
console.log('Số dòng các bảng khác (gói / bản thật):')
for (const t of ['customers', 'order_items', 'order_events', 'order_anh_thanh_pham', 'users']) {
  const a = goi.prepare('select count(*) n from "' + t + '"').get().n
  const b = that.prepare('select count(*) n from "' + t + '"').get().n
  console.log('   ' + t.padEnd(22) + a + ' / ' + b + (a > b ? '   <-- GÓI NHIỀU HƠN, LẠ' : ''))
}
console.log()
console.log('Ảnh upload: gói ' + process.env.SO_ANH_GOI + ' / bản thật ' + process.env.SO_ANH_THAT)
console.log()

const datYeuCau = iv === 'ok' && lech.length === 0 && thieu.length === 0 && Number(process.env.SO_ANH_GOI) > 0
console.log(datYeuCau
  ? '✅ GÓI BACKUP CHUẨN — mọi đơn trong gói khớp y hệt bản thật.'
  : '❌ GÓI BACKUP CÓ VẤN ĐỀ — xem các dòng LỆCH / KHÔNG thấy ở trên.')
process.exit(datYeuCau ? 0 : 1)
JS
KQ=$?
docker exec -i "$C" rm -f /tmp/goi.db /tmp/that.db
exit $KQ
