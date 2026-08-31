import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'fs'
import path from 'path'
import * as schema from './schema'
import { seedNeuTrong } from './seed-core'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')

function taoKetNoi() {
  fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true })
  const conn = new Database(path.join(DATA_DIR, 'tram-banh.db'))
  conn.pragma('journal_mode = WAL')
  conn.pragma('foreign_keys = ON')
  return conn
}

export function taoDb(conn: Database.Database) {
  const db = drizzle(conn, { schema })
  // KHÔNG chạy khi `next build`: lúc thu thập page-data, nhiều worker import module này cùng lúc
  // sẽ đua nhau ghi vào cùng một file SQLite → build fail ngẫu nhiên với lỗi
  // "Failed to collect page data for /api/...". Cả migrate lẫn seed đều chỉ cần chạy lúc
  // server thật khởi động — khi đó `NEXT_PHASE` rỗng nên vẫn chạy bình thường.
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
    // Tự tạo admin + sản phẩm mẫu + vị nếu DB trống (deploy mới khỏi seed thủ công).
    seedNeuTrong(db)
  }
  return db
}

// singleton qua globalThis để Next dev không mở nhiều kết nối
const g = globalThis as unknown as { __db?: ReturnType<typeof taoDb>; __sqlite?: Database.Database }

export const sqlite = (g.__sqlite ??= taoKetNoi())
export const db = (g.__db ??= taoDb(sqlite))
