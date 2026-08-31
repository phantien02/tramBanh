/**
 * Tạo một gói backup: DB (đã VACUUM INTO, đã kiểm tra) + toàn bộ ảnh upload.
 *
 * Chạy:  npm run backup
 * Biến môi trường:
 *   DATA_DIR    thư mục dữ liệu   (mặc định ./data)
 *   BACKUP_DIR  nơi để gói backup (mặc định ./backups)
 *   GIU_LAI     giữ bao nhiêu bản (mặc định 30)
 *
 * KHÔNG đưa file .env vào gói: nó chứa SESSION_SECRET. Cất riêng chỗ khác
 * (trình quản lý mật khẩu), đừng đẩy lên cùng nơi với dữ liệu.
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { kiemTraBanSao, taoBanSaoDb, xoayVong } from '../src/lib/backup'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(process.cwd(), 'backups')
const GIU_LAI = Number(process.env.GIU_LAI ?? 30)

function ngayHomNay() {
  // TZ đã đặt Asia/Ho_Chi_Minh qua npm script.
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function coChu(n: number) {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`
}

const nguon = path.join(DATA_DIR, 'tram-banh.db')
if (!fs.existsSync(nguon)) {
  console.error(`Không thấy DB: ${nguon}`)
  process.exit(1)
}

const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-backup-'))
try {
  const banSao = path.join(tam, 'tram-banh.db')

  console.log('1/4 Tạo bản sao nhất quán bằng VACUUM INTO…')
  taoBanSaoDb(nguon, banSao)

  console.log('2/4 Đối chiếu bản sao với bản gốc…')
  const soDong = kiemTraBanSao(nguon, banSao)
  for (const [bang, n] of Object.entries(soDong)) console.log(`      ${bang}: ${n} dòng`)

  console.log('3/4 Đóng gói kèm ảnh upload…')
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const tenGoi = `tram-banh-backup-${ngayHomNay()}.tar.gz`
  const goi = path.join(BACKUP_DIR, tenGoi)
  if (fs.existsSync(goi)) fs.rmSync(goi) // chạy lại trong ngày thì ghi đè bản của chính hôm nay

  const coUploads = fs.existsSync(path.join(DATA_DIR, 'uploads'))
  const doiSo = ['-czf', tenGoi, '-C', tam, 'tram-banh.db']
  if (coUploads) doiSo.push('-C', DATA_DIR, 'uploads')
  else console.log('      (không có thư mục uploads, bỏ qua)')
  // Chạy trong BACKUP_DIR và truyền -f bằng TÊN FILE chứ không phải đường dẫn tuyệt đối:
  // tar của Git Bash trên Windows đọc "C:\..." thành tên máy chủ từ xa rồi báo
  // "Cannot connect to C: resolve failed". Linux không dính, nhưng để dev trên Windows chạy được.
  execFileSync('tar', doiSo, { cwd: BACKUP_DIR })

  console.log('4/4 Dọn bản cũ…')
  const daXoa = xoayVong(BACKUP_DIR, GIU_LAI)
  if (daXoa.length) console.log(`      đã xóa ${daXoa.length} bản cũ hơn ${GIU_LAI} bản gần nhất`)

  console.log(`\nXong: ${goi} (${coChu(fs.statSync(goi).size)})`)
} finally {
  fs.rmSync(tam, { recursive: true, force: true })
}
