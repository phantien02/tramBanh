import { describe, it, expect } from 'vitest'
import { db } from './index'
import { users } from './schema'

describe('db', () => {
  it('kết nối và truy vấn được bảng users', () => {
    const rows = db.select().from(users).all()
    expect(Array.isArray(rows)).toBe(true)
  })
})
