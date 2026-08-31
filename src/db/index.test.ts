import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { taoDb } from './index'
import { users } from './schema'

const phaseGoc = process.env.NEXT_PHASE

afterEach(() => {
  if (phaseGoc === undefined) delete process.env.NEXT_PHASE
  else process.env.NEXT_PHASE = phaseGoc
})

function coBangUsers(conn: Database.Database) {
  return conn
    .prepare("select name from sqlite_master where type = 'table' and name = 'users'")
    .get()
}

describe('taoDb', () => {
  it('chạy migration khi server thật khởi động', () => {
    const conn = new Database(':memory:')
    const db = taoDb(conn)

    expect(coBangUsers(conn)).toBeDefined()
    expect(db.select().from(users).all()).toBeInstanceOf(Array)

    conn.close()
  })

  it('KHÔNG chạy migration lúc next build, để nhiều worker khỏi đua ghi cùng file DB', () => {
    process.env.NEXT_PHASE = 'phase-production-build'
    const conn = new Database(':memory:')

    taoDb(conn)

    expect(coBangUsers(conn)).toBeUndefined()
    conn.close()
  })
})
