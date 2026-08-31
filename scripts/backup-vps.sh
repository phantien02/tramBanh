#!/usr/bin/env bash
#
# Điểm vào cho cron trên VPS: tạo gói backup rồi đẩy lên Google Drive.
#
#   0 2 * * *  /opt/apps/tram-banh/scripts/backup-vps.sh >> /var/log/tram-banh-backup.log 2>&1
#
# Biến môi trường (đều có mặc định):
#   REPO         thư mục mã nguồn        (mặc định /opt/apps/tram-banh)
#   DICH_RCLONE  đích trên rclone        (mặc định gdrive:tram-banh-backup)
#   GIU_NGAY     giữ bao nhiêu ngày      (mặc định 30)

set -euo pipefail

REPO="${REPO:-/opt/apps/tram-banh}"
DICH_RCLONE="${DICH_RCLONE:-gdrive:tram-banh-backup}"
GIU_NGAY="${GIU_NGAY:-30}"

export TZ=Asia/Ho_Chi_Minh
cd "$REPO"

echo "===== $(date '+%Y-%m-%d %H:%M:%S') bắt đầu backup ====="

if ! command -v npm >/dev/null 2>&1; then
  echo "LỖI: không thấy npm trên máy chủ. Cài Node 22 rồi chạy lại:" >&2
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs" >&2
  exit 1
fi

# npm run backup lo phần khó: VACUUM INTO (nhất quán kể cả khi app đang ghi),
# đối chiếu số dòng với bản gốc, đóng gói kèm ảnh, xoay vòng bản cũ.
GIU_LAI="$GIU_NGAY" npm run backup

if ! command -v rclone >/dev/null 2>&1; then
  echo "" >&2
  echo "LỖI: chưa cài/cấu hình rclone — gói backup mới chỉ nằm TRÊN CHÍNH VPS NÀY." >&2
  echo "Backup cùng ổ đĩa với bản gốc thì không phải backup. Xem README mục 'Sao lưu'." >&2
  exit 1
fi

echo "Đẩy lên $DICH_RCLONE …"
rclone copy "$REPO/backups" "$DICH_RCLONE" --include "tram-banh-backup-*.tar.gz"

# Dọn bản cũ ở đầu xa (đầu gần đã do npm run backup lo).
rclone delete "$DICH_RCLONE" --min-age "${GIU_NGAY}d" --include "tram-banh-backup-*.tar.gz"

echo "Xong. Bản hiện có trên Drive:"
rclone ls "$DICH_RCLONE" | tail -5
