import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

/** Escape dấu nháy đơn để nhét đường dẫn vào chuỗi SQL. */
function duongDanSql(p: string) {
  return p.replace(/'/g, "''")
}

function moChiDoc(duongDan: string) {
  return new Database(duongDan, { readonly: true, fileMustExist: true })
}

function danhSachBang(conn: Database.Database) {
  return conn
    .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name")
    .all()
    .map((r) => (r as { name: string }).name)
}

function demDong(conn: Database.Database, bang: string) {
  return (conn.prepare(`select count(*) as n from "${bang}"`).get() as { n: number }).n
}

/**
 * Tạo bản sao nhất quán của DB đang chạy bằng `VACUUM INTO`.
 *
 * KHÔNG được thay bằng copy file. SQLite chạy chế độ WAL: dữ liệu vừa ghi nằm
 * trong `tram-banh.db-wal` cho tới khi được gộp. Copy trần mỗi `.db` là mất phần
 * lớn dữ liệu gần nhất **mà không báo lỗi gì** — đợt chuyển VPS 29/08/2026 đã
 * gặp đúng cảnh này: `.db` 224KB trong khi `-wal` giữ 4.1MB chưa gộp.
 * `VACUUM INTO` đọc xuyên qua WAL nên bản sao luôn đủ và không cần dừng app.
 */
export function taoBanSaoDb(nguon: string, dich: string) {
  if (fs.existsSync(dich)) throw new Error(`Bản sao đã tồn tại, không ghi đè: ${dich}`)
  fs.mkdirSync(path.dirname(dich), { recursive: true })

  const conn = moChiDoc(nguon)
  try {
    conn.exec(`VACUUM INTO '${duongDanSql(dich)}'`)
  } finally {
    conn.close()
  }
}

/**
 * Kiểm bản sao trước khi coi là backup hợp lệ: chạy `integrity_check` rồi đối
 * chiếu số dòng từng bảng với bản gốc. Backup hỏng mà tưởng là tốt còn tệ hơn
 * không có backup, nên thà ném lỗi để cron báo còn hơn im lặng.
 */
export function kiemTraBanSao(nguon: string, dich: string): Record<string, number> {
  const ban = moChiDoc(dich)
  try {
    const kq = ban.pragma('integrity_check') as { integrity_check: string }[]
    if (kq[0]?.integrity_check !== 'ok') {
      throw new Error(`Bản sao hỏng: integrity_check = ${kq[0]?.integrity_check}`)
    }

    const goc = moChiDoc(nguon)
    try {
      const soDong: Record<string, number> = {}
      for (const bang of danhSachBang(goc)) {
        const nGoc = demDong(goc, bang)
        let nBan: number
        try {
          nBan = demDong(ban, bang)
        } catch {
          throw new Error(`Bản sao thiếu bảng "${bang}"`)
        }
        if (nBan !== nGoc) {
          throw new Error(`Bảng "${bang}" lệch: bản gốc ${nGoc} dòng, bản sao ${nBan} dòng`)
        }
        soDong[bang] = nBan
      }
      return soDong
    } finally {
      goc.close()
    }
  } finally {
    ban.close()
  }
}

/**
 * Giữ `giuLai` bản backup mới nhất trong thư mục, xóa phần cũ hơn.
 * Chỉ đụng vào file backup (`*backup*.tar.gz`), không động file khác.
 */
export function xoayVong(thuMuc: string, giuLai: number): string[] {
  if (!fs.existsSync(thuMuc)) return []

  const banBackup = fs
    .readdirSync(thuMuc)
    .filter((ten) => ten.includes('backup') && ten.endsWith('.tar.gz'))
    .map((ten) => ({ ten, sua: fs.statSync(path.join(thuMuc, ten)).mtimeMs }))
    .sort((a, b) => b.sua - a.sua)

  const canXoa = banBackup.slice(giuLai)
  for (const { ten } of canXoa) fs.rmSync(path.join(thuMuc, ten))
  return canXoa.map((b) => b.ten)
}
