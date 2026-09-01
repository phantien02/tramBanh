#!/usr/bin/env bash
#
# Nạp dữ liệu từ bản THẬT (cổng 3000) sang bản TEST (cổng 4000). MỘT CHIỀU.
#
#   cd /opt/apps/tram-banh-test && ./scripts/sync-tu-prod.sh
#
# Bản thật chỉ bị ĐỌC. Không lệnh nào ở đây restart, rebuild hay ghi vào nó.
# Bản chụp DB lấy bằng VACUUM INTO chạy BÊN TRONG container thật, nên bản thật
# không phải dừng một phút nào, và bản chụp vẫn nhất quán kể cả khi đang có
# người tạo đơn (VACUUM INTO đọc xuyên qua WAL).
#
# Máy chủ KHÔNG có Node trên host — đó là lý do mọi thao tác SQLite đều phải
# chui vào container.
#
# Biến môi trường (đều có mặc định):
#   PROD_DIR / TEST_DIR   thư mục hai bản
#   PROD_SERVICE          tên service trong docker-compose.yml của bản thật

set -euo pipefail

PROD_DIR="${PROD_DIR:-/opt/apps/tram-banh}"
TEST_DIR="${TEST_DIR:-/opt/apps/tram-banh-test}"
PROD_SERVICE="${PROD_SERVICE:-tram-banh}"
TEST_SERVICE="${TEST_SERVICE:-tram-banh-test}"
TEST_COMPOSE="docker-compose.test.yml"

prod() { docker compose --project-directory "$PROD_DIR" -f "$PROD_DIR/docker-compose.yml" "$@"; }
test_() { docker compose --project-directory "$TEST_DIR" -f "$TEST_DIR/$TEST_COMPOSE" "$@"; }

# ── Chốt chặn ──────────────────────────────────────────────────────────────
# Trùng thư mục nghĩa là sắp ghi đè DB thật bằng chính nó, hoặc tệ hơn. Sai một
# biến môi trường ở bước này thì không có đường lùi, nên chặn cứng.
if [ "$(readlink -f "$PROD_DIR")" = "$(readlink -f "$TEST_DIR")" ]; then
  echo "DỪNG: PROD_DIR và TEST_DIR trỏ cùng một chỗ ($PROD_DIR)." >&2
  echo "Bản test phải nằm ở thư mục riêng, nếu không là ghi đè dữ liệu thật." >&2
  exit 1
fi
[ -d "$PROD_DIR" ] || { echo "DỪNG: không thấy $PROD_DIR" >&2; exit 1; }
[ -d "$TEST_DIR" ] || { echo "DỪNG: không thấy $TEST_DIR" >&2; exit 1; }
[ -f "$TEST_DIR/$TEST_COMPOSE" ] || { echo "DỪNG: không thấy $TEST_DIR/$TEST_COMPOSE" >&2; exit 1; }
prod ps --status running --services 2>/dev/null | grep -qx "$PROD_SERVICE" \
  || { echo "DỪNG: container bản thật ($PROD_SERVICE) không chạy — không lấy được bản chụp." >&2; exit 1; }

echo "===== $(date '+%Y-%m-%d %H:%M:%S') sync THẬT → TEST ====="
echo "  thật: $PROD_DIR   (chỉ đọc)"
echo "  test: $TEST_DIR"
echo

echo "1/6 Chụp DB bản thật bằng VACUUM INTO (bản thật vẫn chạy)…"
prod exec -T "$PROD_SERVICE" rm -f /tmp/snap.db
prod exec -T "$PROD_SERVICE" node <<'JS'
const D = require('better-sqlite3')
const db = new D('/app/data/tram-banh.db', { readonly: true })
db.exec("VACUUM INTO '/tmp/snap.db'")
JS

echo "2/6 Đối chiếu bản chụp với bản gốc…"
# Lệch là dừng hẳn, KHÔNG đụng tới bản test. Thà không sync còn hơn sync một bản
# thiếu rồi tưởng đang nhìn dữ liệu thật.
prod exec -T "$PROD_SERVICE" node <<'JS'
const D = require('better-sqlite3')
const chup = new D('/tmp/snap.db', { readonly: true })
const iv = chup.pragma('integrity_check')[0].integrity_check
if (iv !== 'ok') { console.error('   bản chụp hỏng: integrity_check = ' + iv); process.exit(1) }
const goc = new D('/app/data/tram-banh.db', { readonly: true })
for (const t of ['orders', 'customers', 'order_items', 'users']) {
  const a = goc.prepare('select count(*) n from "' + t + '"').get().n
  const b = chup.prepare('select count(*) n from "' + t + '"').get().n
  if (a !== b) { console.error('   bảng ' + t + ' lệch: gốc ' + a + ', bản chụp ' + b); process.exit(1) }
  console.log('      ' + t + ': ' + b)
}
JS

echo "3/6 Lấy bản chụp ra khỏi container…"
mkdir -p "$TEST_DIR/data"
prod cp "$PROD_SERVICE:/tmp/snap.db" "$TEST_DIR/data/tram-banh.db.moi"
prod exec -T "$PROD_SERVICE" rm -f /tmp/snap.db

echo "4/6 Dừng bản test rồi thay DB…"
# Bắt buộc dừng: SQLite giữ file theo inode, thay file dưới chân tiến trình đang
# chạy thì app vẫn đọc bản cũ.
test_ stop >/dev/null 2>&1 || true
rm -f "$TEST_DIR/data/tram-banh.db" "$TEST_DIR/data/tram-banh.db-wal" "$TEST_DIR/data/tram-banh.db-shm"
mv "$TEST_DIR/data/tram-banh.db.moi" "$TEST_DIR/data/tram-banh.db"

echo "5/6 Đồng bộ ảnh upload…"
mkdir -p "$TEST_DIR/data/uploads"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$PROD_DIR/data/uploads/" "$TEST_DIR/data/uploads/"
else
  rm -rf "$TEST_DIR/data/uploads"
  cp -a "$PROD_DIR/data/uploads" "$TEST_DIR/data/uploads"
fi
echo "      $(ls -1 "$TEST_DIR/data/uploads" | wc -l) ảnh"

echo "6/6 Bật lại bản test…"
test_ up -d >/dev/null

echo
echo "Xong. Bản test giờ có:"
sleep 3
test_ exec -T "$TEST_SERVICE" node <<'JS'
const D = require('better-sqlite3')
const db = new D('/app/data/tram-banh.db', { readonly: true })
for (const t of ['orders', 'customers', 'users']) {
  console.log('   ' + t + ': ' + db.prepare('select count(*) n from "' + t + '"').get().n)
}
JS
echo
echo "   http://$(hostname -I | awk '{print $1}'):4000"
