#!/usr/bin/env bash
#
# Backup hằng đêm trên VPS: chụp DB + ảnh, rồi đẩy lên Google Drive.
#
#   0 2 * * *  /opt/apps/tram-banh/scripts/backup-vps.sh >> /var/log/tram-banh-backup.log 2>&1
#
# Máy chủ KHÔNG có Node trên host (đã kiểm 2026-09-01), nên mọi thao tác SQLite
# chui vào container — container có sẵn Node + better-sqlite3.
#
# Lưu ý về phần được test: logic VACUUM INTO và đối chiếu số dòng ở đây là bản
# viết lại cho shell của src/lib/backup.ts. Bản TypeScript (chạy bằng
# `npm run backup`, dùng ở máy dev) mới là bản có unit test. Sửa một bên thì
# nhớ sửa bên kia.
#
# Biến môi trường (đều có mặc định):
#   REPO         thư mục mã nguồn      (/opt/apps/tram-banh)
#   SERVICE      tên service compose   (tram-banh)
#   DICH_RCLONE  đích trên rclone      (backup_trambanh_drive:tram-banh-backup)
#   GIU_NGAY     giữ bao nhiêu ngày trên Drive  (30)
#   GIU_MAY      giữ bao nhiêu bản trên máy chủ (7)
#   BACKUP_DIR   nơi để gói            (/opt/backups/tram-banh)

set -euo pipefail

REPO="${REPO:-/opt/apps/tram-banh}"
SERVICE="${SERVICE:-tram-banh}"
DICH_RCLONE="${DICH_RCLONE:-backup_trambanh_drive:tram-banh-backup}"
GIU_NGAY="${GIU_NGAY:-30}"
GIU_MAY="${GIU_MAY:-7}"
# CỐ Ý để ngoài thư mục mã nguồn: `git clean -fdx` trong repo sẽ xoá sạch mọi thứ
# bị gitignore — kể cả backup. Để ở đây thì một lệnh dọn repo không thổi bay được
# bản lùi cuối cùng. Cũng sống sót khi clone lại repo.
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/tram-banh}"

export TZ=Asia/Ho_Chi_Minh
dc() { docker compose --project-directory "$REPO" -f "$REPO/docker-compose.yml" "$@"; }

echo "===== $(date '+%Y-%m-%d %H:%M:%S') bắt đầu backup ====="

dc ps --status running --services 2>/dev/null | grep -qx "$SERVICE" \
  || { echo "LỖI: container $SERVICE không chạy — không chụp được DB." >&2; exit 1; }

NGAY=$(date +%Y-%m-%d)
GOI="tram-banh-backup-$NGAY.tar.gz"
mkdir -p "$BACKUP_DIR"
TAM=$(mktemp -d)
trap 'rm -rf "$TAM"' EXIT

echo "1/5 Chụp DB bằng VACUUM INTO (app vẫn chạy)…"
dc exec -T "$SERVICE" rm -f /tmp/backup-snap.db
dc exec -T "$SERVICE" node <<'JS'
const D = require('better-sqlite3')
new D('/app/data/tram-banh.db', { readonly: true }).exec("VACUUM INTO '/tmp/backup-snap.db'")
JS

echo "2/5 Đối chiếu bản chụp với bản gốc…"
# Sai lệch thì DỪNG. Một gói backup thiếu mà tưởng là tốt còn tệ hơn không có
# gói nào: tới lúc cần khôi phục mới biết thì đã muộn.
dc exec -T "$SERVICE" node <<'JS'
const D = require('better-sqlite3')
const chup = new D('/tmp/backup-snap.db', { readonly: true })
const iv = chup.pragma('integrity_check')[0].integrity_check
if (iv !== 'ok') { console.error('   bản chụp hỏng: integrity_check = ' + iv); process.exit(1) }
const goc = new D('/app/data/tram-banh.db', { readonly: true })
const bang = goc.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name").all()
for (const { name } of bang) {
  const a = goc.prepare('select count(*) n from "' + name + '"').get().n
  const b = chup.prepare('select count(*) n from "' + name + '"').get().n
  if (a !== b) { console.error('   bảng ' + name + ' lệch: gốc ' + a + ', bản chụp ' + b); process.exit(1) }
}
console.log('      ' + bang.length + ' bảng khớp, ' +
  goc.prepare('select count(*) n from orders').get().n + ' đơn')
JS

echo "3/5 Lấy bản chụp ra và đóng gói kèm ảnh…"
dc cp "$SERVICE:/tmp/backup-snap.db" "$TAM/tram-banh.db"
dc exec -T "$SERVICE" rm -f /tmp/backup-snap.db
tar -czf "$BACKUP_DIR/$GOI" -C "$TAM" tram-banh.db -C "$REPO/data" uploads
echo "      $GOI ($(du -h "$BACKUP_DIR/$GOI" | cut -f1))"

echo "4/5 Dọn bản cũ ở máy chủ (giữ $GIU_MAY bản)…"
# Trên máy chủ chỉ cần vài bản gần đây để khôi phục nhanh; kho dài hạn nằm trên
# Drive. Giữ 30 bản ở cả hai nơi là tốn ~2GB đĩa mà chẳng chống thêm được gì —
# backup nằm cùng ổ với bản gốc vốn không cứu được ca mất cả máy.
ls -1t "$BACKUP_DIR"/tram-banh-backup-*.tar.gz 2>/dev/null \
  | tail -n +$((GIU_MAY + 1)) | xargs -r rm -f

if ! command -v rclone >/dev/null 2>&1; then
  echo "" >&2
  echo "LỖI: chưa cài/cấu hình rclone — gói backup mới chỉ nằm TRÊN CHÍNH VPS NÀY." >&2
  echo "Backup cùng ổ đĩa với bản gốc thì không phải backup. Xem README mục 'Sao lưu'." >&2
  exit 1
fi

echo "5/5 Đẩy lên $DICH_RCLONE…"
rclone copy "$BACKUP_DIR" "$DICH_RCLONE" --include "tram-banh-backup-*.tar.gz"

# --drive-use-trash=false: XÓA THẲNG, không cho vào Thùng rác. Google Drive giữ
# thùng rác 30 ngày và phần đó VẪN TÍNH vào dung lượng, nên nếu để mặc định thì
# mỗi gói dọn đi còn ăn chỗ thêm 30 ngày nữa — tốn gấp đôi mà chẳng để làm gì.
rclone delete "$DICH_RCLONE" --min-age "${GIU_NGAY}d" \
  --include "tram-banh-backup-*.tar.gz" --drive-use-trash=false

echo
echo "Xong. Trên Drive hiện có:"
rclone ls "$DICH_RCLONE" | tail -5
echo "Dung lượng Drive còn lại:"
rclone about "$(echo "$DICH_RCLONE" | cut -d: -f1):" 2>/dev/null | grep -E "^(Used|Free):" | sed 's/^/   /'
