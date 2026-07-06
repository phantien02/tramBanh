import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'fs'
import path from 'path'
import * as schema from './schema'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')

function taoKetNoi() {
  fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true })
  const conn = new Database(path.join(DATA_DIR, 'tram-banh.db'))
  conn.pragma('journal_mode = WAL')
  conn.pragma('foreign_keys = ON')
  return conn
}

function taoDb(conn: Database.Database) {
  const db = drizzle(conn, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
  return db
}

// singleton qua globalThis để Next dev không mở nhiều kết nối
const g = globalThis as unknown as { __db?: ReturnType<typeof taoDb>; __sqlite?: Database.Database }

export const sqlite = (g.__sqlite ??= taoKetNoi())
export const db = (g.__db ??= taoDb(sqlite))
