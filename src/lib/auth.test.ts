import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './auth'

describe('auth', () => {
  it('hash rồi verify đúng mật khẩu', () => {
    const h = hashPassword('matkhau123')
    expect(verifyPassword('matkhau123', h)).toBe(true)
    expect(verifyPassword('sai-mat-khau', h)).toBe(false)
  })
})
